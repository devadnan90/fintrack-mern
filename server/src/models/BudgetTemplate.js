import mongoose from "mongoose";
const budgetTemplateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    items: {
      type: [
        {
          categoryName: {
            type: String,
            required: true,
            trim: true,
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
      ],
      validate: {
        validator: (arr) => arr.length > 0,
        message: "A template needs at least one budget item",
      },
    },
  },
  {
    timestamps: true,
  },
);
const BudgetTemplate = mongoose.model("BudgetTemplate", budgetTemplateSchema);
export default BudgetTemplate;
