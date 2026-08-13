import mongoose from "mongoose";
const householdSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    members: {
      type: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          joinedAt: {
            type: Date,
            default: Date.now,
          },
          _id: false,
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);
householdSchema.methods.memberIds = function memberIds() {
  return [this.owner, ...this.members.map((m) => m.user)];
};
householdSchema.methods.isMember = function isMember(userId) {
  const id = String(userId);
  return (
    String(this.owner) === id || this.members.some((m) => String(m.user) === id)
  );
};
const Household = mongoose.model("Household", householdSchema);
export default Household;
