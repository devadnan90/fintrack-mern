import mongoose from "mongoose";
const transactionSchema = new mongoose.Schema(
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
      index: true,
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
    splits: {
      type: [
        {
          category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
          },
          amount: {
            type: Number,
            required: true,
            min: [1, "Split amount must be greater than zero"],
          },
          _id: false,
        },
      ],
      default: [],
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
    date: {
      type: Date,
      required: true,
      default: Date.now,
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
    attachmentUrl: {
      type: String,
      default: "",
    },
    generatedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecurringTransaction",
      default: null,
    },
    generatedFromBill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bill",
      default: null,
    },
    roundUpSourceTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);
transactionSchema.index({
  user: 1,
  date: -1,
});
transactionSchema.index({
  user: 1,
  account: 1,
  date: -1,
});
transactionSchema.index({
  user: 1,
  category: 1,
});
export function excludeSoftDeleted(next) {
  const options =
    typeof this.getOptions === "function"
      ? this.getOptions()
      : this.options || {};
  if (options.includeDeleted) return next();
  const filter =
    typeof this.getFilter === "function" ? this.getFilter() : this.getQuery();
  if (filter.deletedAt !== undefined) return next();
  this.where({
    deletedAt: null,
  });
  next();
}
export function excludeSoftDeletedAggregate(next) {
  if (!this.options.includeDeleted) {
    this.pipeline().unshift({
      $match: {
        deletedAt: null,
      },
    });
  }
  next();
}
transactionSchema.pre(
  [
    "find",
    "findOne",
    "findOneAndUpdate",
    "findOneAndDelete",
    "findOneAndReplace",
    "countDocuments",
  ],
  excludeSoftDeleted,
);
transactionSchema.pre("aggregate", excludeSoftDeletedAggregate);
transactionSchema.pre("validate", function requireCategoryUnlessTransfer(next) {
  if (this.type !== "transfer" && !this.category && this.splits.length === 0) {
    this.invalidate(
      "category",
      "Category is required for income and expense transactions",
    );
  }
  if (this.type === "transfer" && this.splits.length > 0) {
    this.invalidate("splits", "Transfers cannot be split across categories");
  }
  if (this.splits.length > 0) {
    const sum = this.splits.reduce((total, s) => total + s.amount, 0);
    if (sum !== this.amount) {
      this.invalidate(
        "splits",
        "Split amounts must add up to the transaction total",
      );
    }
  }
  if (this.type === "transfer" && !this.toAccount) {
    this.invalidate(
      "toAccount",
      "toAccount is required for transfer transactions",
    );
  }
  if (
    this.type === "transfer" &&
    this.toAccount &&
    String(this.toAccount) === String(this.account)
  ) {
    this.invalidate(
      "toAccount",
      "Transfer destination must differ from the source account",
    );
  }
  next();
});
const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;
