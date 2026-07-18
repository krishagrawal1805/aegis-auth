import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      index: -1, // Optimized for descending chronological sorts in the dashboard
    },
    eventType: {
      type: String,
      required: true,
      enum: ['USER_LOGIN', 'APPROVAL_GRANTED'],
    },
    description: {
      type: String,
      required: true,
    },
    approvalRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApprovalRequest',
      required: false, // Only present for APPROVAL_GRANTED events
    },
    previousBlockHash: {
      type: String,
      required: true,
      index: true,
      // intentionally omitted unique: true to prevent concurrent login deadlocks during the hackathon
    },
    currentBlockHash: {
      type: String,
      required: true,
      unique: true,
    },
  }
);

export default mongoose.model('AuditLog', auditLogSchema);
