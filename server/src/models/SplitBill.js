import mongoose from "mongoose";
const splitBillSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
      unique: true,
    },
    participants: {
      type: [
        {
          name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
          },
          email: {
            type: String,
            trim: true,
            lowercase: true,
            default: "",
          },
          shareAmount: {
            type: Number,
            required: true,
            min: [1, "Share must be greater than zero"],
          },
          settled: {
            type: Boolean,
            default: false,
          },
          settledAt: {
            type: Date,
            default: null,
          },
        },
      ],
      validate: {
        validator: (arr) => arr.length > 0,
        message: "A split needs at least one participant",
      },
    },
  },
  {
    timestamps: true,
  },
);
const SplitBill = mongoose.model("SplitBill", splitBillSchema);
export default SplitBill;
