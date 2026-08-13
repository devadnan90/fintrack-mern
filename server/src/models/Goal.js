import mongoose from "mongoose";
const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Goal name is required"],
      trim: true,
      maxlength: 80,
    },
    targetAmount: {
      type: Number,
      required: true,
      min: [1, "Target amount must be greater than zero"],
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    targetDate: {
      type: Date,
      default: null,
    },
    currency: {
      type: String,
      uppercase: true,
      minlength: 3,
      maxlength: 3,
      default: "USD",
    },
    achievedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);
const Goal = mongoose.model("Goal", goalSchema);
export default Goal;
