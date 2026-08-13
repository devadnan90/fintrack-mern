import mongoose from "mongoose";
const errorLogSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ["server", "client"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    stack: {
      type: String,
      default: null,
    },
    method: {
      type: String,
      default: null,
    },
    path: {
      type: String,
      default: null,
    },
    statusCode: {
      type: Number,
      default: null,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    ip: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);
errorLogSchema.index({
  createdAt: -1,
});
const ErrorLog = mongoose.model("ErrorLog", errorLogSchema);
export default ErrorLog;
