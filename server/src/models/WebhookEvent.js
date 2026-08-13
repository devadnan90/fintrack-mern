import mongoose from "mongoose";
const webhookEventSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ["razorpay"],
      required: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    signatureValid: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);
webhookEventSchema.index({
  createdAt: -1,
});
const WebhookEvent = mongoose.model("WebhookEvent", webhookEventSchema);
export default WebhookEvent;
