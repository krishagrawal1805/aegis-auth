import mongoose from 'mongoose';
import crypto from 'crypto';

// ==========================================
// 1. ORGANIZATION SCHEMA
// ==========================================
const OrganizationSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  workspace_code: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true,
    minlength: 6,
    maxlength: 6
  }
}, { timestamps: true });

// ==========================================
// 2. USER SCHEMA
// ==========================================
const UserSchema = new mongoose.Schema({
  org_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    trim: true, 
    lowercase: true 
  },
  display_name: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['Admin', 'Approver', 'Requester'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Active', 'Suspended'], 
    default: 'Pending',
    required: true 
  },
  // WebAuthn Public Key Storage
  webauthn_credentials: [{
    credentialId: { type: String, required: true },
    publicKey: { type: String, required: true }, // Store as Base64 or Hex string
    counter: { type: Number, default: 0 }
  }],
  // Ephemeral 3-minute auth challenge cache
  current_challenge: { 
    type: String, 
    default: null 
  },
  challenge_expires_at: { 
    type: Date, 
    default: null 
  }
}, { timestamps: true });

// CRITICAL index to prevent global email collisions
UserSchema.index({ email: 1, org_id: 1 }, { unique: true });

// ==========================================
// 3. APPROVAL REQUEST SCHEMA
// ==========================================
const ApprovalRequestSchema = new mongoose.Schema({
  org_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true 
  },
  requester_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  resourceName: {
    type: String,
    required: true
  },
  actionPayloadHash: {
    type: String,
    required: true
  },
  action_type: { 
    type: String, 
    enum: ['ACTION_DROP_DATABASE', 'ACTION_PROD_DEPLOY'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Executed', 'Expired'], 
    default: 'Pending',
    required: true 
  },
  required_signatures: { 
    type: Number, 
    default: 2,
    required: true 
  },
  signatures: [{
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    credentialId: { type: String, required: true },
    signature: { type: String, required: true },
    signed_challenge: { type: String, required: true }
  }]
}, { timestamps: true });

// ==========================================
// 4. AUDIT LOG SCHEMA
// ==========================================
const AuditLogSchema = new mongoose.Schema({
  org_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true 
  },
  actor_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  action: { 
    type: String, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    required: true 
  },
  payload: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  },
  hmac_signature: { 
    type: String, 
    required: true 
  }
});

// Rigid string concatenation for row-level HMAC signature
AuditLogSchema.methods.generateHmac = function(serverSecret) {
  const dataString = `${this.org_id.toString()}${this.actor_id.toString()}${this.action}${this.timestamp.toISOString()}`;
  return crypto
    .createHmac('sha256', serverSecret)
    .update(dataString)
    .digest('hex');
};

export const Organization = mongoose.model('Organization', OrganizationSchema);
export const User = mongoose.model('User', UserSchema);
export const ApprovalRequest = mongoose.model('ApprovalRequest', ApprovalRequestSchema);
export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
