import mongoose from "mongoose";
const ACCOUNT_TYPES = ["checking", "savings", "credit", "cash"];
const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Account name is required"],
      trim: true,
      maxlength: 60,
    },
    type: {
      type: String,
      enum: ACCOUNT_TYPES,
      required: true,
    },
    institution: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },
    currency: {
      type: String,
      uppercase: true,
      minlength: 3,
      maxlength: 3,
      required: true,
    },
    openingBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);
accountSchema.index({
  user: 1,
  isArchived: 1,
});
export const ACCOUNT_TYPE_VALUES = ACCOUNT_TYPES;
const Account = mongoose.model("Account", accountSchema);
export default Account;
