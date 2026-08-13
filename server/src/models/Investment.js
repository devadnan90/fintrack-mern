import mongoose from "mongoose";
const INVESTMENT_TYPES = ["crypto", "stock", "other"];
const investmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Investment name is required"],
      trim: true,
      maxlength: 80,
    },
    type: {
      type: String,
      enum: INVESTMENT_TYPES,
      required: true,
    },
    symbol: {
      type: String,
      trim: true,
      default: "",
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, "Quantity cannot be negative"],
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    manualPrice: {
      type: Number,
      default: null,
    },
    currency: {
      type: String,
      uppercase: true,
      minlength: 3,
      maxlength: 3,
      default: "USD",
    },
  },
  {
    timestamps: true,
  },
);
investmentSchema.index({
  user: 1,
  type: 1,
});
export const INVESTMENT_TYPE_VALUES = INVESTMENT_TYPES;
const Investment = mongoose.model("Investment", investmentSchema);
export default Investment;
