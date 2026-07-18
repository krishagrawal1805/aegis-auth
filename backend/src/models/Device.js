import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    credentialId: {
      type: String,
      required: true,
      unique: true, // Crucial for fast WebAuthn lookups during login
    },
    publicKey: {
      type: String,
      required: true,
    },
    counter: {
      type: Number,
      required: true,
      min: 0, // Prevents replay attacks
    },
    deviceName: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true
  }
);

export default mongoose.model('Device', deviceSchema);
