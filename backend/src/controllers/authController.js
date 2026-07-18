import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { User, Organization } from '../models/models.js';
import { challengeStore } from '../stores/challengeStore.js';
import { exchangeStore } from '../stores/exchangeStore.js';
import { sseStore } from '../stores/sseStore.js';
import { auditQueue } from '../stores/auditQueue.js';
import { generateToken, setTokenCookie, clearTokenCookie } from '../utils/jwt.js';

// Environment configurations
const rpName = process.env.RP_NAME || 'Aegis_Hackathon';
const rpID = process.env.RP_ID || 'localhost';
const expectedOrigin = process.env.EXPECTED_ORIGIN || 'http://localhost:3000';

export const registerChallenge = async (req, res) => {
  try {
    const { email, displayName, role } = req.body;
    const orgId = req.orgId; // Injected by resolveTenant middleware

    // Enforce role domains
    const allowedRoles = ['Admin', 'Approver', 'Requester'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role selected' });
    }

    // Check if user already exists IN THIS ORGANIZATION
    const existingUser = await User.findOne({ email: email.toLowerCase(), org_id: orgId });
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'Email already registered in this workspace' });
    }

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(`${orgId.toString()}:${email.toLowerCase()}`),
      userName: email.toLowerCase(),
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
    });

    // Store in memory (5 min TTL)
    challengeStore.set(email.toLowerCase(), { 
      challenge: options.challenge, 
      profile: { email: email.toLowerCase(), displayName, role, org_id: orgId } 
    });

    res.status(200).json({ success: true, options });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const registerVerify = async (req, res) => {
  try {
    const { email, deviceName, registrationResponse } = req.body;
    const storedData = challengeStore.get(email.toLowerCase());

    if (!storedData) {
      return res.status(400).json({ success: false, error: 'Registration session expired' });
    }

    const verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge: storedData.challenge,
      expectedOrigin,
      expectedRPID: rpID,
    });

    if (verification.verified) {
      const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;
      
      // Write permanent state into the User collection with embedded credentials
      const newUser = await User.create({
        org_id: storedData.profile.org_id,
        email: storedData.profile.email,
        display_name: storedData.profile.displayName,
        role: storedData.profile.role,
        status: 'Active',
        webauthn_credentials: [{
          credentialId: Buffer.from(credentialID).toString('base64url'),
          publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
          counter,
        }]
      });

      // Log the registration event cryptographically
      auditQueue.add({
        org_id: newUser.org_id,
        actor_id: newUser._id,
        action: 'USER_REGISTER',
        payload: { email: newUser.email, deviceName: deviceName || 'Passkey' }
      });

      // Issue JWT containing orgId
      const token = generateToken(newUser._id, newUser.role, newUser.org_id);
      setTokenCookie(res, token);
      
      challengeStore.remove(email.toLowerCase());
      res.status(201).json({ success: true });
    } else {
      res.status(400).json({ success: false, error: 'Cryptographic attestation failed' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const loginChallenge = async (req, res) => {
  try {
    const { email, sessionId } = req.body;
    const orgId = req.orgId;

    const user = await User.findOne({ email: email.toLowerCase(), org_id: orgId });
    if (!user) return res.status(404).json({ success: false, error: 'User not found in this workspace' });

    if (!user.webauthn_credentials || user.webauthn_credentials.length === 0) {
      return res.status(404).json({ success: false, error: 'No passkeys registered for this account' });
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: user.webauthn_credentials.map(cred => ({
        id: Buffer.from(cred.credentialId, 'base64url'),
        type: 'public-key',
      })),
      userVerification: 'preferred',
    });

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
      orgId
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

export const loginVerify = async (req, res) => {
  try {
    const { email, selectedCode, authenticationResponse, isLocal, deviceName } = req.body;
    const storedData = challengeStore.get(email.toLowerCase());

    if (!storedData) return res.status(400).json({ success: false, error: 'Login session expired' });

    // 1. Verify Number Match
    if (selectedCode && Number(selectedCode) !== storedData.verificationCode) {
      return res.status(401).json({ success: false, error: 'Verification code mismatch (Possible Phishing/Fatigue Attack)' });
    }

    const user = await User.findById(storedData.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    // Locate the specific credential in user's embedded passkeys list
    const credential = user.webauthn_credentials.find(cred => cred.credentialId === authenticationResponse.id);
    if (!credential) {
      return res.status(404).json({ success: false, error: 'Matching passkey credential not found' });
    }

    // 2. Verify Cryptographic Assertion Signature
    const verification = await verifyAuthenticationResponse({
      response: authenticationResponse,
      expectedChallenge: storedData.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      authenticator: {
        credentialPublicKey: Buffer.from(credential.publicKey, 'base64url'),
        credentialID: Buffer.from(credential.credentialId, 'base64url'),
        counter: credential.counter,
      },
    });

    if (verification.verified) {
      const { newCounter } = verification.authenticationInfo;
      
      // Update counter directly on the embedded credential object
      credential.counter = newCounter;
      await user.save();

      // Log successful login event
      auditQueue.add({
        org_id: user.org_id,
        actor_id: user._id,
        action: 'USER_LOGIN',
        payload: { email: user.email, deviceName: deviceName || 'Passkey' }
      });

      challengeStore.remove(email.toLowerCase());

      // 3. Cross-Device Handshake Delivery
      if (storedData.sessionId && !isLocal) {
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
