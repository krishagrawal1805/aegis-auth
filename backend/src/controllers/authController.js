import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import crypto from 'crypto';
import { User, Organization } from '../models/models.js';
import { challengeStore } from '../stores/challengeStore.js';
import { exchangeStore } from '../stores/exchangeStore.js';
import { sseStore } from '../stores/sseStore.js';
import { auditQueue } from '../stores/auditQueue.js';
import { generateToken, setTokenCookie, clearTokenCookie } from '../utils/jwt.js';

// Normalize base64url strings by stripping padding and converting base64 chars
const normalizeCredId = (id) => id.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

// Environment configurations
const rpName = process.env.RP_NAME || 'Aegis_Hackathon';
const rpID = process.env.RP_ID || 'localhost';
const expectedOrigin = process.env.EXPECTED_ORIGIN || 'http://localhost:3000';

// Helper: Generate a unique 6-character alphanumeric workspace code
const generateWorkspaceCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();

export const registerChallenge = async (req, res) => {
  try {
    const { email, displayName, role, workspaceCode } = req.body;

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(email.toLowerCase()),
      userName: email.toLowerCase(),
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // Store in memory (5 min TTL)
    challengeStore.set(email.toLowerCase(), { 
      challenge: options.challenge, 
      profile: { email: email.toLowerCase(), displayName, role } 
    });

    res.status(200).json({ success: true, options });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Placeholder registerVerify to maintain existing structure if needed
export const registerVerify = async (req, res) => {
  res.status(400).json({ success: false, error: 'Use /org/create or /org/join instead' });
};

// ==========================================
// 1. CREATE ORGANIZATION & GENESIS ADMIN
// ==========================================
export const orgCreate = async (req, res) => {
  try {
    const { org_name, admin_email, admin_name, registrationResponse, deviceName } = req.body;

    const storedData = challengeStore.get(admin_email.toLowerCase());
    if (!storedData) {
      return res.status(400).json({ success: false, error: 'Registration session expired' });
    }

    // 1. Verify FIDO2 registration response
    const verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge: storedData.challenge,
      expectedOrigin,
      expectedRPID: rpID,
    });

    if (!verification.verified) {
      return res.status(400).json({ success: false, error: 'Cryptographic attestation failed' });
    }

    const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

    // 2. Generate unique workspace code and create organization
    let workspaceCode = generateWorkspaceCode();
    // Ensure uniqueness
    while (await Organization.findOne({ workspace_code: workspaceCode })) {
      workspaceCode = generateWorkspaceCode();
    }

    const organization = await Organization.create({
      name: org_name,
      workspace_code: workspaceCode
    });

    // 3. Create the Genesis Admin (Active immediately)
    const adminUser = await User.create({
      org_id: organization._id,
      email: admin_email.toLowerCase(),
      display_name: admin_name,
      role: 'Admin',
      status: 'Active',
      webauthn_credentials: [{
        credentialId: Buffer.from(credentialID).toString('base64url'),
        publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
        counter,
      }]
    });

    // Clean up challenge
    challengeStore.remove(admin_email.toLowerCase());

    // Log the genesis admin registration event cryptographically
    auditQueue.add({
      org_id: organization._id,
      actor_id: adminUser._id,
      action: 'USER_REGISTER',
      payload: { email: adminUser.email, deviceName: deviceName || 'Passkey' }
    });

    // Issue JWT containing orgId
    const token = generateToken(adminUser._id, adminUser.role, organization._id);
    setTokenCookie(res, token);

    res.status(201).json({ 
      success: true,
      message: 'Organization created', 
      workspace_code: organization.workspace_code,
      user_id: adminUser._id
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================
// 2. REQUEST TO JOIN WORKSPACE
// ==========================================
export const orgJoin = async (req, res) => {
  try {
    const { workspace_code, email, display_name, registrationResponse, deviceName } = req.body;
    const wsCode = workspace_code || req.body.workspaceCode;

    const storedData = challengeStore.get(email.toLowerCase());
    if (!storedData) {
      return res.status(400).json({ success: false, error: 'Registration session expired' });
    }

    // 1. Find the target organization
    const org = await Organization.findOne({ workspace_code: wsCode.toUpperCase() });
    if (!org) return res.status(404).json({ success: false, error: 'Workspace not found' });

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase(), org_id: org._id });
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'Email already registered in this workspace' });
    }

    // 2. Verify FIDO2 registration response
    const verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge: storedData.challenge,
      expectedOrigin,
      expectedRPID: rpID,
    });

    if (!verification.verified) {
      return res.status(400).json({ success: false, error: 'Cryptographic attestation failed' });
    }

    const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

    // 3. Create the User in "Pending" state (ADR Requirement)
    const newUser = await User.create({
      org_id: org._id,
      email: email.toLowerCase(),
      display_name: display_name,
      role: 'Requester', // Default safe role
      status: 'Pending', 
      webauthn_credentials: [{
        credentialId: Buffer.from(credentialID).toString('base64url'),
        publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
        counter,
      }]
    });

    // Clean up challenge
    challengeStore.remove(email.toLowerCase());

    // Log the pending join request event cryptographically
    auditQueue.add({
      org_id: org._id,
      actor_id: newUser._id,
      action: 'USER_REGISTER',
      payload: { email: newUser.email, status: 'Pending', deviceName: deviceName || 'Passkey' }
    });

    // Broadcast real-time SSE notification to all admins in the organization
    const admins = await User.find({ org_id: org._id, role: 'Admin' });
    admins.forEach(admin => {
      sseStore.sendToUser(admin._id, 'MEMBER_JOIN_REQUEST', { email: newUser.email });
    });

    res.status(201).json({ 
      success: true,
      message: 'Join request submitted. Awaiting Admin approval.' 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================
// 3. GENERATE LOGIN CHALLENGE
// ==========================================
export const loginChallenge = async (req, res) => {
  try {
    const { email, workspace_code, sessionId } = req.body;
    const wsCode = workspace_code || req.body.workspaceCode;

    // 1. Find Org first to isolate the tenant (ADR Requirement)
    const org = await Organization.findOne({ workspace_code: wsCode.toUpperCase() });
    if (!org) return res.status(404).json({ success: false, error: 'Workspace not found' });

    // 2. Lookup by BOTH org_id and email to prevent collisions (ADR Requirement)
    const user = await User.findOne({ email: email.toLowerCase(), org_id: org._id });
    if (!user) return res.status(404).json({ success: false, error: 'User not found in this workspace' });
    
    if (user.status !== 'Active') {
      return res.status(403).json({ success: false, error: 'Account is pending or suspended' });
    }

    if (!user.webauthn_credentials || user.webauthn_credentials.length === 0) {
      return res.status(404).json({ success: false, error: 'No passkeys registered for this account' });
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [],
      userVerification: 'preferred',
    });

    // 3. Generate Challenge & enforce strict 3-minute TTL (ADR Requirement)
    user.current_challenge = options.challenge;
    user.challenge_expires_at = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes TTL
    await user.save();

    // NUMBER MATCHING LOGIC (MFA Fatigue Prevention)
    const verificationCode = Math.floor(Math.random() * 90) + 10; // 10-99
    const fake1 = Math.floor(Math.random() * 90) + 10;
    const fake2 = Math.floor(Math.random() * 90) + 10;
    const codeChoices = [verificationCode, fake1, fake2].sort(() => 0.5 - Math.random());

    challengeStore.set(email.toLowerCase(), { 
      challenge: options.challenge, 
      verificationCode,
      sessionId,
      userId: user._id,
      orgId: org._id
    });

    // Cross-Device Push
    if (sessionId) {
      sseStore.sendToUser(user._id, 'LOGIN_PROMPT', { 
        email: user.email, 
        codeChoices,
        options 
      });
    }

    res.status(200).json({ success: true, options, verificationCode });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================
// 4. VERIFY LOGIN SIGNATURE
// ==========================================
export const loginVerify = async (req, res) => {
  try {
    const { email, workspace_code, selectedCode, authenticationResponse, isLocal, deviceName } = req.body;
    const wsCode = workspace_code || req.body.workspaceCode;

    const org = await Organization.findOne({ workspace_code: wsCode.toUpperCase() });
    if (!org) return res.status(404).json({ success: false, error: 'Workspace not found' });

    const user = await User.findOne({ email: email.toLowerCase(), org_id: org._id });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    // 1. Validate TTL (Fail-Fast Security)
    if (!user.current_challenge || !user.challenge_expires_at) {
      return res.status(400).json({ success: false, error: 'No active login challenge' });
    }
    if (new Date() > user.challenge_expires_at) {
      user.current_challenge = null;
      user.challenge_expires_at = null;
      await user.save();
      return res.status(401).json({ success: false, error: 'Challenge expired. Please try again.' });
    }

    // 2. Verify Number Match (If present)
    const storedData = challengeStore.get(email.toLowerCase());
    if (selectedCode && storedData && Number(selectedCode) !== storedData.verificationCode) {
      return res.status(401).json({ success: false, error: 'Verification code mismatch (Possible Phishing/Fatigue Attack)' });
    }

    // Locate the specific credential in user's embedded passkeys list
    // Normalize both sides to handle base64 vs base64url padding differences
    const incomingId = normalizeCredId(authenticationResponse.id || '');
    console.log('[loginVerify] Looking for credential. Incoming ID:', incomingId);
    console.log('[loginVerify] Stored credentials:', user.webauthn_credentials.map(c => normalizeCredId(c.credentialId)));
    
    // Find matching credential, or if mock is true and there are credentials, use the first one
    const credential = authenticationResponse.mock === true 
      ? user.webauthn_credentials[0] 
      : user.webauthn_credentials.find(cred => normalizeCredId(cred.credentialId) === incomingId);

    if (!credential) {
      return res.status(404).json({ success: false, error: 'Matching passkey credential not found' });
    }

    // 3. Verify Cryptographic Assertion Signature
    let verified = false;
    let newCounter = credential.counter;

    if (process.env.NODE_ENV !== 'production' && authenticationResponse.mock === true) {
      console.log('[loginVerify] BYPASSING cryptographic validation for DEMO mode');
      verified = true;
    } else {
      const verification = await verifyAuthenticationResponse({
        response: authenticationResponse,
        expectedChallenge: user.current_challenge,
        expectedOrigin,
        expectedRPID: rpID,
        authenticator: {
          credentialPublicKey: Buffer.from(credential.publicKey, 'base64url'),
          credentialID: Buffer.from(credential.credentialId, 'base64url'),
          counter: credential.counter,
        },
      });
      verified = verification.verified;
      if (verified) {
        newCounter = verification.authenticationInfo.newCounter;
      }
    }

    if (verified) {
      // Update counter and CLEAR the challenge to prevent replay attacks
      credential.counter = newCounter;
      user.current_challenge = null;
      user.challenge_expires_at = null;
      await user.save();

      // Log successful login event
      auditQueue.add({
        org_id: user.org_id,
        actor_id: user._id,
        action: 'USER_LOGIN',
        payload: { email: user.email, deviceName: deviceName || 'Passkey' }
      });

      if (storedData) {
        challengeStore.remove(email.toLowerCase());
      }

      // 4. Cross-Device Handshake Delivery
      if (storedData && storedData.sessionId && !isLocal) {
        const token = exchangeStore.createToken(storedData.sessionId, user._id);
        sseStore.sendToSession(storedData.sessionId, 'LOGIN_SUCCESS', { exchangeToken: token });
        return res.status(200).json({ success: true, crossDevice: true });
      }

      // Local Login Delivery
      const jwtToken = generateToken(user._id, user.role, user.org_id);
      setTokenCookie(res, jwtToken);
      return res.status(200).json({ success: true, crossDevice: false });
    } else {
      res.status(401).json({ success: false, error: 'Cryptographic validation failed' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const exchangeSession = async (req, res) => {
  const { sessionId, exchangeToken } = req.body;
  const result = exchangeStore.consumeToken(exchangeToken, sessionId);

  if (!result.valid) {
    return res.status(403).json({ success: false, error: result.error });
  }

  const user = await User.findById(result.userId);
  const jwtToken = generateToken(user._id, user.role, user.org_id);
  setTokenCookie(res, jwtToken);

  res.status(200).json({ success: true });
};

export const logout = (req, res) => {
  clearTokenCookie(res);
  res.status(200).json({ success: true });
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('org_id', 'name workspace_code')
      .select('-__v -createdAt -updatedAt');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const approveUser = async (req, res) => {
  try {
    const { email, role } = req.body;

    if (req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: Only administrators can approve users' });
    }

    const user = await User.findOne({ email: email.toLowerCase(), org_id: req.user.orgId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found in this workspace' });
    }

    user.status = 'Active';
    if (role) {
      user.role = role;
    }
    await user.save();

    // Log the approval action cryptographically
    auditQueue.add({
      org_id: req.user.orgId,
      actor_id: req.user.userId,
      action: 'USER_APPROVED',
      payload: { approvedEmail: user.email, assignedRole: user.role }
    });

    res.status(200).json({ success: true, message: 'User approved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPendingUsers = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: Only administrators can view pending users' });
    }
    const pendingUsers = await User.find({ org_id: req.user.orgId, status: 'Pending' }).select('email display_name role createdAt');
    res.status(200).json({ success: true, users: pendingUsers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getOrgMembers = async (req, res) => {
  try {
    const tenantId = req.user.orgId;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'No organization context found in session.' });
    }

    const members = await User.find({ org_id: tenantId })
      .select('email display_name role status')
      .lean();

    const membersWithOnlineStatus = members.map(m => ({
      email: m.email,
      display_name: m.display_name,
      role: m.role,
      status: m.status,
      online: sseStore.isUserOnline(m._id)
    }));

    res.status(200).json({ success: true, members: membersWithOnlineStatus });
  } catch (error) {
    console.error('Workspace roster fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


