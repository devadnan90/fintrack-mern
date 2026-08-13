import mongoose from "mongoose";
export const MATCH_TYPE_VALUES = ["contains", "exact"];
const merchantRuleSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    pattern: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    matchType: {
      type: String,
      enum: MATCH_TYPE_VALUES,
      default: "contains",
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);
merchantRuleSchema.index(
  {
    user: 1,
    pattern: 1,
  },
  {
    unique: true,
  },
);
merchantRuleSchema.pre("validate", function lowercasePattern(next) {
  if (this.pattern) this.pattern = this.pattern.toLowerCase();
  next();
});
const MerchantRule = mongoose.model("MerchantRule", merchantRuleSchema);
export default MerchantRule;
