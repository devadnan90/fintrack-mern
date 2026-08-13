import mongoose from "mongoose";
const NOTIFICATION_TYPES = [
  "bill-upcoming",
  "bill-overdue",
  "budget-approaching",
  "budget-exceeded",
  "goal-achieved",
];
const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    link: {
      type: String,
      default: "",
    },
    dedupeKey: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);
notificationSchema.index({
  user: 1,
  createdAt: -1,
});
notificationSchema.index(
  {
    user: 1,
    dedupeKey: 1,
  },
  {
    unique: true,
  },
);
export const NOTIFICATION_TYPE_VALUES = NOTIFICATION_TYPES;
const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
