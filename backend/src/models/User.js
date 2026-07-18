import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    role: {
      type: String,
      required: true,
      enum: ['SeniorAdmin', 'LeadDev', 'Dev'],
    },
  },
  {
    timestamps: true
  }
);

export default mongoose.model('User', userSchema);
