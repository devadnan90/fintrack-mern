import mongoose from "mongoose";
const RECURRENCE_VALUES = ["none", "weekly", "monthly", "yearly"];
const billSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Bill name is required"],
      trim: true,
      maxlength: 80,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, "Amount must be greater than zero"],
    },
    dueDate: {
      type: Date,
      required: true,
    },
    recurrence: {
      type: String,
      enum: RECURRENCE_VALUES,
      default: "none",
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    reminderDaysBefore: {
      type: Number,
      default: 3,
      min: 0,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);
billSchema.index({
  user: 1,
  dueDate: 1,
});
export const RECURRENCE_TYPE_VALUES = RECURRENCE_VALUES;
const Bill = mongoose.model("Bill", billSchema);
export default Bill;
