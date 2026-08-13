import mongoose from "mongoose";
const debtSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Debt name is required"],
      trim: true,
      maxlength: 80,
    },
    balance: {
      type: Number,
      required: true,
      min: [0, "Balance cannot be negative"],
    },
    apr: {
      type: Number,
      required: true,
      min: [0, "APR cannot be negative"],
      max: [100, "APR looks too high — enter it as a percentage, e.g. 19.99"],
    },
    minimumPayment: {
      type: Number,
      required: true,
      min: [0, "Minimum payment cannot be negative"],
    },
  },
  {
    timestamps: true,
  },
);
debtSchema.index({
  user: 1,
  createdAt: 1,
});
const Debt = mongoose.model("Debt", debtSchema);
export default Debt;
