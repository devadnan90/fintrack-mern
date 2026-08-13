import mongoose from "mongoose";
const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    categoryName: {
      type: String,
      trim: true,
      default: null,
    },
    household: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Household",
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, "Amount must be greater than zero"],
    },
    period: {
      type: String,
      enum: ["weekly", "monthly"],
      required: true,
    },
    rollover: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);
budgetSchema.pre("validate", function requireCategoryOrHousehold(next) {
  if (this.household) {
    if (!this.categoryName || !this.categoryName.trim()) {
      this.invalidate(
        "categoryName",
        "categoryName is required for a household budget",
      );
    }
    this.category = null;
  } else {
    if (!this.category) {
      this.invalidate("category", "category is required for a personal budget");
    }
    this.categoryName = null;
  }
  next();
});
budgetSchema.index(
  {
    user: 1,
    category: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      household: null,
    },
  },
);
budgetSchema.index(
  {
    household: 1,
    categoryName: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      household: {
        $type: "objectId",
      },
    },
  },
);
const Budget = mongoose.model("Budget", budgetSchema);
export default Budget;
