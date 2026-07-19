import crypto from 'crypto';
import { ApprovalRequest, User, AuditLog } from '../models/models.js';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { sseStore } from '../stores/sseStore.js';
import { auditQueue } from '../stores/auditQueue.js';

// Normalize base64url strings by stripping padding and converting base64 chars
const normalizeCredId = (id) => id.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

const rpID = process.env.RP_ID || 'localhost';
const expectedOrigin = process.env.EXPECTED_ORIGIN || 'http://localhost:3000';

// In-memory map for co-signing challenges with 3-minute TTL (ADR requirement)
const activeSigningChallenges = new Map();

export const createApprovalRequest = async (req, res) => {
  try {
    const { resourceName, actionPayload } = req.body;
    const orgId = req.orgId;
    const requesterId = req.user.userId;

    // Compile hash from transaction action payload
    const actionPayloadHash = crypto.createHash('sha256').update(actionPayload).digest('hex');

    // Hackathon policy: prod/wipe resources require 2 signatures from Admins/Approvers
    let required_signatures = 1;
    let action_type = 'ACTION_PROD_DEPLOY';

    if (resourceName.toLowerCase().includes('prod') || resourceName.toLowerCase().includes('wipe') || resourceName.toLowerCase().includes('drop')) {
      required_signatures = 2;
      action_type = 'ACTION_DROP_DATABASE';
    }

    const newRequest = await ApprovalRequest.create({
      org_id: orgId,
      requester_id: requesterId,
      resourceName,
      actionPayloadHash,
      action_type,
      status: 'Pending',
      required_signatures,
      signatures: []
    });

    // Broadcast to eligible users in the same organization
    const eligibleRoles = ['Admin', 'Approver'];
    const eligibleUsers = await User.find({ org_id: orgId, role: { $in: eligibleRoles } });

    eligibleUsers.forEach(user => {
      sseStore.sendToUser(user._id, 'APPROVAL_REQUIRED', {
        approvalRequestId: newRequest._id,
        resourceName: newRequest.resourceName,
        actionPayloadHash: newRequest.actionPayloadHash,
        requiredCount: newRequest.required_signatures
      });
    });

    res.status(202).json({
      success: true,
      approvalRequestId: newRequest._id,
      actionPayloadHash: newRequest.actionPayloadHash,
      status: newRequest.status,
      requiredCount: newRequest.required_signatures
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPendingApprovals = async (req, res) => {
  try {
    const orgId = req.orgId;
    const userRole = req.user.role;

    // Requesters are not eligible to sign pending requests
    if (!['Admin', 'Approver'].includes(userRole)) {
      return res.status(200).json({ success: true, requests: [] });
    }

    // Find pending requests for this organization
    const requests = await ApprovalRequest.find({
      org_id: orgId,
      status: 'Pending'
    }).populate('requester_id', 'display_name email').sort({ createdAt: -1 });

    // Format fields to match frontend expectation (requiredCount vs required_signatures)
    const formattedRequests = requests.map(reqDoc => {
      const obj = reqDoc.toObject();
      obj.requiredCount = reqDoc.required_signatures;
      obj.signatures = reqDoc.signatures.map(sig => ({
        userId: sig.user_id,
        credentialId: sig.credentialId,
        signature: sig.signature,
        signed_challenge: sig.signed_challenge
      }));
      return obj;
    });

    res.status(200).json({ success: true, requests: formattedRequests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const signChallenge = async (req, res) => {
  try {
    const userId = req.user.userId;
    const challenge = crypto.randomBytes(32).toString('base64url');

    if (activeSigningChallenges.has(userId)) {
      clearTimeout(activeSigningChallenges.get(userId).timerId);
    }

    const timerId = setTimeout(() => {
      activeSigningChallenges.delete(userId);
      console.log(`[sseEngine] Signing challenge expired for user: ${userId}`);
    }, 3 * 60 * 1000); // 3-minute TTL

    activeSigningChallenges.set(userId, { challenge, timerId });
    res.status(200).json({ success: true, challenge });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const signApprovalRequest = async (req, res) => {
  try {
    // Handle either request_id or approvalRequestId, and user_id or req.user.userId
    const { approvalRequestId, request_id, deviceCredentialId, credentialId, signatureValue, signature } = req.body;
    const targetRequestId = approvalRequestId || request_id;
    const targetCredentialId = deviceCredentialId || credentialId;
    const targetSignature = signatureValue || signature;

    const signingUserId = req.user.userId;
    const orgId = req.orgId;

    console.log(`[signApprovalRequest] Request received. user: ${signingUserId}, requestId: ${targetRequestId}, org: ${orgId}`);

    const user = await User.findOne({ _id: signingUserId, org_id: orgId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found in this workspace' });
    }

    // 1. Fetch the request and check eligibility
    const request = await ApprovalRequest.findOne({ _id: targetRequestId, org_id: orgId });
    if (!request) {
      return res.status(404).json({ success: false, error: 'Approval request not found in this workspace' });
    }
    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, error: 'Request is no longer pending' });
    }
    if (!['Admin', 'Approver'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Your role is not authorized to sign this request' });
    }

    // Check if this specific user has already signed (Trap 2 Safeguard)
    const alreadySigned = request.signatures.some(sig => sig.user_id.toString() === signingUserId);
    if (alreadySigned) {
      return res.status(400).json({ success: false, error: 'You have already signed this request' });
    }

    // 2. Validate Challenge exists in memory (3-min TTL)
    const challengeData = activeSigningChallenges.get(signingUserId);
    if (!challengeData) {
      return res.status(400).json({ success: false, error: 'Challenge expired or missing. Try again.' });
    }

    // 3. Locate the credential: use the ID from the assertion response itself
    //    (not the frontend-provided deviceCredentialId, which can mismatch 
    //     when user picks a different passkey from the Windows Hello prompt)
    let parsedAssertion = {};
    let isMock = false;
    try {
      parsedAssertion = typeof targetSignature === 'string' ? JSON.parse(targetSignature) : targetSignature;
      if (parsedAssertion.mock === true) {
        isMock = true;
      }
    } catch (e) {
      if (targetSignature === 'mock-signature' || targetSignature === 'mock') {
        isMock = true;
      }
    }

    const assertionCredId = isMock ? '' : normalizeCredId(parsedAssertion.id || targetCredentialId || '');
    console.log('[signApproval] Looking for credential from assertion. ID:', assertionCredId, 'isMock:', isMock);
    
    // Find matching credential, or if mock is true, use the first one
    const credential = isMock
      ? user.webauthn_credentials[0]
      : user.webauthn_credentials.find(cred => normalizeCredId(cred.credentialId) === assertionCredId);

    if (!credential) {
      return res.status(404).json({ success: false, error: 'Matching passkey credential not found. Make sure you select YOUR passkey, not another user\'s.' });
    }

    // 4. Verify Cryptographic Assertion Signature
    let verified = false;
    let newCounter = credential.counter;

    if (process.env.NODE_ENV !== 'production' && isMock) {
      console.log('[signApproval] BYPASSING cryptographic validation for DEMO mode');
      verified = true;
    } else {
      const verification = await verifyAuthenticationResponse({
        response: parsedAssertion,
        expectedChallenge: challengeData.challenge,
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

    if (!verified) {
      return res.status(401).json({ success: false, error: 'Cryptographic validation failed' });
    }

    // Clear challenge from map to prevent replay attacks
    clearTimeout(challengeData.timerId);
    activeSigningChallenges.delete(signingUserId);

    // Update credential counter
    credential.counter = newCounter;
    await user.save();

    // Atomic update step using Mongo thread filters to push the signature
    const updatedRequest = await ApprovalRequest.findOneAndUpdate(
      { 
        _id: targetRequestId, 
        status: 'Pending',
        'signatures.user_id': { $ne: signingUserId }
      },
      {
        $push: {
          signatures: {
            user_id: signingUserId,
            credentialId: targetCredentialId,
            signature: targetSignature,
            signed_challenge: challengeData.challenge
          }
        }
      },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(409).json({ success: false, error: 'Conflict detected. Status changed or signature registered.' });
    }

    console.log(`[signApprovalRequest] Signature registered. Total: ${updatedRequest.signatures.length}/${updatedRequest.required_signatures}`);

    // Check unique signers count (Trap 2 Safeguard)
    const uniqueSigners = new Set(updatedRequest.signatures.map(s => s.user_id.toString()));

    if (uniqueSigners.size >= updatedRequest.required_signatures && updatedRequest.status !== 'Executed') {
      updatedRequest.status = 'Executed';
      await updatedRequest.save();

      console.log(`[signApprovalRequest] Request ${targetRequestId} EXECUTED. Logging to auditQueue.`);

      // Log to cryptographic audit log history
      auditQueue.add({
        org_id: orgId,
        actor_id: signingUserId,
        action: updatedRequest.action_type,
        payload: {
          approvalRequestId: updatedRequest._id,
          resourceName: updatedRequest.resourceName,
          signaturesCount: updatedRequest.signatures.length,
          signers: Array.from(uniqueSigners)
        }
      });

      // Broadcast success update via SSE streams
      eligibleUsersNotify(updatedRequest, 'APPROVAL_COMPLETED');
    }

    res.status(200).json({ success: true, status: updatedRequest.status });
  } catch (error) {
    console.error('[signApprovalRequest] Unexpected server error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const eligibleUsersNotify = async (request, eventType) => {
  const eligibleRoles = ['Admin', 'Approver'];
  const users = await User.find({ org_id: request.org_id, role: { $in: eligibleRoles } });
  users.forEach(u => {
    sseStore.sendToUser(u._id, eventType, {
      approvalRequestId: request._id,
      status: request.status
    });
  });
};
