import mongoose from "mongoose";
const RECURRENCE_VALUES = ["weekly", "monthly", "yearly"];
const recurringTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    toAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    type: {
      type: String,
      enum: ["income", "expense", "transfer"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, "Amount must be greater than zero"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    recurrence: {
      type: String,
      enum: RECURRENCE_VALUES,
      required: true,
    },
    nextDueDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastGeneratedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);
recurringTransactionSchema.index({
  user: 1,
  isActive: 1,
  nextDueDate: 1,
});
recurringTransactionSchema.pre(
  "validate",
  function requireCategoryUnlessTransfer(next) {
    if (this.type !== "transfer" && !this.category) {
      this.invalidate(
        "category",
        "Category is required for income and expense templates",
      );
    }
    if (this.type === "transfer" && !this.toAccount) {
      this.invalidate(
        "toAccount",
        "toAccount is required for transfer templates",
      );
    }
    next();
  },
);
export const RECURRING_TXN_RECURRENCE_VALUES = RECURRENCE_VALUES;
const RecurringTransaction = mongoose.model(
  "RecurringTransaction",
  recurringTransactionSchema,
);
export default RecurringTransaction;
