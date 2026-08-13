import mongoose from "mongoose";
const loginActivitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    email: {
      type: String,
      default: null,
    },
    success: {
      type: Boolean,
      required: true,
    },
    method: {
      type: String,
      enum: ["password", "2fa", "passkey"],
      required: true,
    },
    reason: {
      type: String,
      default: null,
    },
    ip: {
      type: String,
      default: null,
    },
    browser: {
      type: String,
      default: null,
    },
    os: {
      type: String,
      default: null,
    },
    deviceType: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    country: {
      type: String,
      default: null,
    },
    region: {
      type: String,
      default: null,
    },
    city: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);
loginActivitySchema.index({
  createdAt: -1,
});
const LoginActivity = mongoose.model("LoginActivity", loginActivitySchema);
export default LoginActivity;
