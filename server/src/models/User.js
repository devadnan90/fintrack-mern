import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false,
    },
    baseCurrency: {
      type: String,
      default: "USD",
      uppercase: true,
      minlength: 3,
      maxlength: 3,
    },
    avatar: {
      type: String,
      default: "",
    },
    accentColor: {
      type: String,
      default: null,
    },
    dateFormat: {
      type: String,
      enum: ["MDY", "DMY", "YMD"],
      default: "MDY",
    },
    emailNotifications: {
      billReminders: {
        type: Boolean,
        default: true,
      },
      budgetAlerts: {
        type: Boolean,
        default: true,
      },
      goalMilestones: {
        type: Boolean,
        default: true,
      },
      anomalyAlerts: {
        type: Boolean,
        default: true,
      },
    },
    roundUpSavings: {
      enabled: {
        type: Boolean,
        default: false,
      },
      destinationAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Account",
        default: null,
      },
      roundToCents: {
        type: Number,
        default: 100,
        min: 10,
      },
    },
    twoFactor: {
      enabled: {
        type: Boolean,
        default: false,
      },
      secret: {
        type: String,
        default: null,
        select: false,
      },
      pendingSecret: {
        type: String,
        default: null,
        select: false,
      },
      backupCodeHashes: {
        type: [String],
        default: [],
        select: false,
      },
    },
    currentChallenge: {
      type: String,
      default: null,
      select: false,
    },
    scheduledReports: {
      enabled: {
        type: Boolean,
        default: false,
      },
      frequency: {
        type: String,
        enum: ["weekly", "monthly"],
        default: "weekly",
      },
      dayOfWeek: {
        type: Number,
        min: 0,
        max: 6,
        default: 1,
      },
      dayOfMonth: {
        type: Number,
        min: 1,
        max: 28,
        default: 1,
      },
      lastSentAt: {
        type: Date,
        default: null,
      },
    },
    premium: {
      plan: {
        type: String,
        default: null,
      },
      orderId: {
        type: String,
        default: null,
      },
      paymentId: {
        type: String,
        default: null,
      },
      activatedAt: {
        type: Date,
        default: null,
      },
      expiresAt: {
        type: Date,
        default: null,
      },
    },
    aiUsage: {
      date: {
        type: String,
        default: null,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    banned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);
userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
userSchema.methods.matchPassword = async function matchPassword(
  enteredPassword,
) {
  return bcrypt.compare(enteredPassword, this.password);
};
userSchema.methods.hasActivePremium = function hasActivePremium(
  now = new Date(),
) {
  return Boolean(this.premium?.expiresAt && this.premium.expiresAt > now);
};
userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    baseCurrency: this.baseCurrency,
    avatar: this.avatar,
    accentColor: this.accentColor,
    dateFormat: this.dateFormat,
    emailNotifications: this.emailNotifications,
    roundUpSavings: this.roundUpSavings,
    scheduledReports: this.scheduledReports,
    twoFactorEnabled: this.twoFactor?.enabled || false,
    premium: {
      plan: this.premium?.plan || null,
      expiresAt: this.premium?.expiresAt || null,
      isActive: this.hasActivePremium(),
    },
    createdAt: this.createdAt,
  };
};
const User = mongoose.model("User", userSchema);
export default User;
