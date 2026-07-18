import crypto from 'crypto';
import { ApprovalRequest, User } from '../models/models.js';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { sseStore } from '../stores/sseStore.js';
import { auditQueue } from '../stores/auditQueue.js';

const rpID = process.env.RP_ID || 'localhost';
const expectedOrigin = process.env.EXPECTED_ORIGIN || 'http://localhost:3000';

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
      // Map signatures list format if necessary (user_id -> userId)
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

export const signApprovalRequest = async (req, res) => {
  try {
    const { approvalRequestId, deviceCredentialId, signatureValue } = req.body;
    const signingUserId = req.user.userId;
    const orgId = req.orgId;

    console.log(`[signApprovalRequest] Request received. user: ${signingUserId}, requestId: ${approvalRequestId}, org: ${orgId}`);

    const user = await User.findOne({ _id: signingUserId, org_id: orgId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found in this workspace' });
    }

    // 1. Fetch the request and check eligibility
    const request = await ApprovalRequest.findOne({ _id: approvalRequestId, org_id: orgId });
    if (!request) {
      return res.status(404).json({ success: false, error: 'Approval request not found in this workspace' });
    }
    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, error: 'Request is no longer pending' });
    }
    if (!['Admin', 'Approver'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Your role is not authorized to sign this request' });
    }

    // Check if this specific user has already signed
    const alreadySigned = request.signatures.some(sig => sig.user_id.toString() === signingUserId);
    if (alreadySigned) {
      return res.status(400).json({ success: false, error: 'You have already signed this request' });
    }

    // 2. Locate the credential embedded on user profile
    const credential = user.webauthn_credentials.find(cred => cred.credentialId === deviceCredentialId);
    if (!credential) {
      return res.status(404).json({ success: false, error: 'Matching passkey credential not found' });
    }

    // 3. Verify Cryptographic Assertion Signature
    // The browser signs the actionPayloadHash as the challenge
    const dummyChallenge = request.actionPayloadHash;

    const verification = await verifyAuthenticationResponse({
      response: JSON.parse(signatureValue),
      expectedChallenge: dummyChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      authenticator: {
        credentialPublicKey: Buffer.from(credential.publicKey, 'base64url'),
        credentialID: Buffer.from(credential.credentialId, 'base64url'),
        counter: credential.counter,
      },
    });

    if (!verification.verified) {
      return res.status(401).json({ success: false, error: 'Cryptographic validation failed' });
    }

    // Update credential counter
    credential.counter = verification.authenticationInfo.newCounter;
    await user.save();

    // Atomic update step using Mongo thread filters to push the signature
    const updatedRequest = await ApprovalRequest.findOneAndUpdate(
      { 
        _id: approvalRequestId, 
        status: 'Pending',
        'signatures.user_id': { $ne: signingUserId }
      },
      {
        $push: {
          signatures: {
            user_id: signingUserId,
            credentialId: deviceCredentialId,
            signature: signatureValue,
            signed_challenge: dummyChallenge
          }
        }
      },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(409).json({ success: false, error: 'Conflict detected. Status changed or signature registered.' });
    }

    console.log(`[signApprovalRequest] Signature registered. Total: ${updatedRequest.signatures.length}/${updatedRequest.required_signatures}`);

    // Check if threshold condition is reached
    if (updatedRequest.signatures.length >= updatedRequest.required_signatures) {
      updatedRequest.status = 'Executed';
      await updatedRequest.save();

      console.log(`[signApprovalRequest] Request ${approvalRequestId} EXECUTED. Logging to auditQueue.`);

      // Log to cryptographic audit log history
      auditQueue.add({
        org_id: orgId,
        actor_id: signingUserId,
        action: 'APPROVAL_GRANTED',
        payload: {
          approvalRequestId: updatedRequest._id,
          resourceName: updatedRequest.resourceName,
          signaturesCount: updatedRequest.signatures.length
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
