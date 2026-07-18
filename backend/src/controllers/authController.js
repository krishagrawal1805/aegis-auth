import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import User from '../models/User.js';
import Device from '../models/Device.js';
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

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(email.toLowerCase()),
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
      profile: { email: email.toLowerCase(), displayName, role } 
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
      
      // Write permanent state to DB
      const newUser = await User.create(storedData.profile);
      await Device.create({
        userId: newUser._id,
        credentialId: Buffer.from(credentialID).toString('base64url'),
        publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
        counter,
        deviceName,
      });

      // Issue JWT
      const token = generateToken(newUser._id, newUser.role);
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

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const devices = await Device.find({ userId: user._id });
    if (devices.length === 0) return res.status(404).json({ success: false, error: 'No devices registered' });

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: devices.map(dev => ({
        id: Buffer.from(dev.credentialId, 'base64url'),
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
      userId: user._id
    });

    // Cross-Device Push
    if (sessionId) {
      sseStore.sendToUser(user._id, 'LOGIN_PROMPT', { 
        email: user.email, 
        codeChoices,
        options // Pass the options to the authenticator device directly
      });
    }

    res.status(200).json({ success: true, options, verificationCode });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const loginVerify = async (req, res) => {
  try {
    const { email, selectedCode, authenticationResponse, isLocal } = req.body;
    const storedData = challengeStore.get(email.toLowerCase());

    if (!storedData) return res.status(400).json({ success: false, error: 'Login session expired' });

    // 1. Verify Number Match (Human Intention Check)
    console.log(`[authController] verifying code. selectedCode: ${selectedCode}, storedCode: ${storedData.verificationCode}`);
    if (selectedCode && Number(selectedCode) !== storedData.verificationCode) {
      console.warn(`[authController] code mismatch: ${selectedCode} !== ${storedData.verificationCode}`);
      return res.status(401).json({ success: false, error: 'Verification code mismatch (Possible Phishing/Fatigue Attack)' });
    }

    const device = await Device.findOne({ credentialId: authenticationResponse.id });
    if (!device) {
      console.warn(`[authController] Device mapping not found for credentialId: ${authenticationResponse.id}`);
      return res.status(404).json({ success: false, error: 'Device not found' });
    }

    // 2. Verify Cryptographic Signature
    const verification = await verifyAuthenticationResponse({
      response: authenticationResponse,
      expectedChallenge: storedData.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      authenticator: {
        credentialPublicKey: Buffer.from(device.publicKey, 'base64url'),
        credentialID: Buffer.from(device.credentialId, 'base64url'),
        counter: device.counter,
      },
    });

    if (verification.verified) {
      const { newCounter } = verification.authenticationInfo;
      await Device.updateOne({ _id: device._id }, { $set: { counter: newCounter } });

      const user = await User.findById(storedData.userId);

      // Log successful login
      auditQueue.add({
        eventType: 'USER_LOGIN',
        description: `User ${user.email} authenticated via ${device.deviceName}`,
      });

      challengeStore.remove(email.toLowerCase());

      // 3. Cross-Device Handshake Delivery
      if (storedData.sessionId && !isLocal) {
        const token = exchangeStore.createToken(storedData.sessionId, user._id);
        sseStore.sendToSession(storedData.sessionId, 'LOGIN_SUCCESS', { exchangeToken: token });
        
        // Respond to the mobile phone without setting the cookie
        return res.status(200).json({ success: true, crossDevice: true });
      }

      // Local Login Delivery
      const jwtToken = generateToken(user._id, user.role);
      setTokenCookie(res, jwtToken);
      return res.status(200).json({ success: true, crossDevice: false });
    } else {
      console.error('[authController] FIDO2 verification failed. Verification object:', verification);
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
  const jwtToken = generateToken(user._id, user.role);
  setTokenCookie(res, jwtToken);

  res.status(200).json({ success: true });
};

export const logout = (req, res) => {
  clearTokenCookie(res);
  res.status(200).json({ success: true });
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-__v -createdAt -updatedAt');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
