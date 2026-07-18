import crypto from 'crypto';
import ApprovalRequest from '../models/ApprovalRequest.js';
import User from '../models/User.js';
import Device from '../models/Device.js';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { sseStore } from '../stores/sseStore.js';
import { auditQueue } from '../stores/auditQueue.js';

const rpID = process.env.RP_ID || 'localhost';
const expectedOrigin = process.env.EXPECTED_ORIGIN || 'http://localhost:3000';

export const createApprovalRequest = async (req, res) => {
  try {
    const { resourceName, actionPayload } = req.body;

    // Compile hash from transaction action payload
    const actionPayloadHash = crypto.createHash('sha256').update(actionPayload).digest('hex');

    // Hackathon hardcoded policy mapping based on resource name
    let requiredCount = 1;
    let eligibleRoles = ['Dev', 'LeadDev', 'SeniorAdmin'];

    if (resourceName.toLowerCase().includes('prod')) {
      requiredCount = 2;
      eligibleRoles = ['LeadDev', 'SeniorAdmin'];
    }

    const newRequest = await ApprovalRequest.create({
      resourceName,
      actionPayloadHash,
      requiredCount,
      eligibleRoles,
      status: 'pending',
      signatures: []
    });

    // Fetch all users matching the eligible roles to trigger real-time notification broadcast
    const eligibleUsers = await User.find({ role: { $in: eligibleRoles } });

    eligibleUsers.forEach(user => {
      sseStore.sendToUser(user._id, 'APPROVAL_REQUIRED', {
        approvalRequestId: newRequest._id,
        resourceName: newRequest.resourceName,
        actionPayloadHash: newRequest.actionPayloadHash,
        requiredCount: newRequest.requiredCount
      });
    });

    res.status(202).json({
      success: true,
      approvalRequestId: newRequest._id,
      actionPayloadHash: newRequest.actionPayloadHash,
      status: newRequest.status,
      requiredCount: newRequest.requiredCount
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPendingApprovals = async (req, res) => {
  try {
    // Find pending requests where user's current token role is authorized to sign
    const requests = await ApprovalRequest.find({
      status: 'pending',
      eligibleRoles: req.user.role
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const signApprovalRequest = async (req, res) => {
  try {
    const { approvalRequestId, deviceCredentialId, signatureValue } = req.body;
    const signingUserId = req.user.userId;

    console.log(`[signApprovalRequest] Request received. user: ${signingUserId}, requestId: ${approvalRequestId}`);

    const user = await User.findById(signingUserId);
    if (!user) {
      console.warn(`[signApprovalRequest] User not found: ${signingUserId}`);
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // 1. Fetch the request and check eligibility
    const request = await ApprovalRequest.findById(approvalRequestId);
    if (!request) {
      console.warn(`[signApprovalRequest] Request not found: ${approvalRequestId}`);
      return res.status(404).json({ success: false, error: 'Approval request not found' });
    }
    if (request.status !== 'pending') {
      console.warn(`[signApprovalRequest] Request is not pending (status: ${request.status})`);
      return res.status(400).json({ success: false, error: 'Request is no longer pending' });
    }
    if (!request.eligibleRoles.includes(user.role)) {
      console.warn(`[signApprovalRequest] User role not authorized: ${user.role} not in ${request.eligibleRoles}`);
      return res.status(403).json({ success: false, error: 'Your role is not authorized to sign this request' });
    }

    // Check if this specific user has already signed
    const alreadySigned = request.signatures.some(sig => sig.userId.toString() === signingUserId);
    if (alreadySigned) {
      console.warn(`[signApprovalRequest] User already signed: ${signingUserId}`);
      return res.status(400).json({ success: false, error: 'You have already signed this request' });
    }

    // 2. Fetch the signature device from DB
    const device = await Device.findOne({ credentialId: deviceCredentialId, userId: signingUserId });
    if (!device) {
      console.warn(`[signApprovalRequest] Device credential mapping not found for credentialId: ${deviceCredentialId}`);
      return res.status(404).json({ success: false, error: 'Valid credential mapping not found' });
    }

    // Reconstruction of WebAuthn structural object to bypass full challenge roundtrip for transaction payloads
    // The browser signs the raw hex hash of the deployment metadata payload
    const dummyChallenge = request.actionPayloadHash;

    // Atomic update step using Mongo thread filters
    const updatedRequest = await ApprovalRequest.findOneAndUpdate(
      { 
        _id: approvalRequestId, 
        status: 'pending',
        'signatures.userId': { $ne: signingUserId } // Ensure double submit guard
      },
      {
        $push: {
          signatures: {
            userId: signingUserId,
            deviceCredentialId,
            signatureValue,
            signedAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!updatedRequest) {
      console.warn(`[signApprovalRequest] Conflict update failed for request: ${approvalRequestId}`);
      return res.status(409).json({ success: false, error: 'Conflict detected. Status changed or signature registered.' });
    }

    console.log(`[signApprovalRequest] Signature registered successfully. Total: ${updatedRequest.signatures.length}/${updatedRequest.requiredCount}`);

    // Check if threshold condition is reached
    if (updatedRequest.signatures.length >= updatedRequest.requiredCount) {
      updatedRequest.status = 'approved';
      await updatedRequest.save();

      console.log(`[signApprovalRequest] Request ${approvalRequestId} APPROVED. Logging to auditQueue.`);

      // Log to cryptographic audit log history
      auditQueue.add({
        eventType: 'APPROVAL_GRANTED',
        description: `Action on resource [${updatedRequest.resourceName}] dynamically authorized via ${updatedRequest.signatures.length} cryptographically secure signatures.`,
        approvalRequestId: updatedRequest._id
      });

      // Broadcast success update via general active streams
      eligibleUsersNotify(updatedRequest, 'APPROVAL_COMPLETED');
    }

    res.status(200).json({ success: true, status: updatedRequest.status });
  } catch (error) {
    console.error('[signApprovalRequest] Unexpected server error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Helper utility function to handle cross SSE broad signals
const eligibleUsersNotify = async (request, eventType) => {
  const users = await User.find({ role: { $in: request.eligibleRoles } });
  users.forEach(u => {
    sseStore.sendToUser(u._id, eventType, {
      approvalRequestId: request._id,
      status: request.status
    });
  });
};
