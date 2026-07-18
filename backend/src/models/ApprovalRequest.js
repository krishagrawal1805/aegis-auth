import mongoose from 'mongoose';

// Subdocument schema for the signatures array
const signatureSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deviceCredentialId: {
      type: String,
      required: true,
    },
    signatureValue: {
      type: String,
      required: true,
    },
    signedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false } // Prevents Mongoose from auto-generating IDs for each signature subdocument to save space
);

const approvalRequestSchema = new mongoose.Schema(
  {
    resourceName: {
      type: String,
      required: true,
    },
    actionPayloadHash: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true, // Speeds up the GET /api/approvals/pending query
    },
    requiredCount: {
      type: Number,
      required: true,
      min: 1,
    },
    eligibleRoles: [
      {
        type: String,
        required: true,
      },
    ],
    signatures: [signatureSchema],
  },
  {
    timestamps: true
  }
);

export default mongoose.model('ApprovalRequest', approvalRequestSchema);
