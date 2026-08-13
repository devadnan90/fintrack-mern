import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import Account from "../models/Account.js";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import Budget from "../models/Budget.js";
import Goal from "../models/Goal.js";
import Bill from "../models/Bill.js";
import Notification from "../models/Notification.js";
import Household from "../models/Household.js";
import HouseholdInvite from "../models/HouseholdInvite.js";
import SplitBill from "../models/SplitBill.js";
import Passkey from "../models/Passkey.js";
import PushSubscription from "../models/PushSubscription.js";
import { assertStrongPassword } from "../utils/validators.js";
import {
  generateTotpSecret,
  buildSetupPayload,
  verifyTotp,
  generateBackupCodes,
  hashBackupCode,
} from "../utils/twoFactor.js";
const REFRESH_COOKIE = "fintrack_refresh";
const MAX_AVATAR_LENGTH = 500_000;
const EMAIL_NOTIFICATION_KEYS = [
  "billReminders",
  "budgetAlerts",
  "goalMilestones",
  "anomalyAlerts",
];
export const updateProfile = asyncHandler(async (req, res) => {
  const {
    name,
    avatar,
    baseCurrency,
    dateFormat,
    emailNotifications,
    roundUpSavings,
    scheduledReports,
    accentColor,
  } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  if (name !== undefined) {
    if (!name.trim()) {
      res.status(400);
      throw new Error("Name cannot be empty");
    }
    user.name = name.trim();
  }
  if (avatar !== undefined) {
    if (avatar && avatar.length > MAX_AVATAR_LENGTH) {
      res.status(400);
      throw new Error("Avatar image is too large. Please use a smaller image.");
    }
    user.avatar = avatar;
  }
  if (baseCurrency !== undefined) {
    if (!/^[A-Za-z]{3}$/.test(baseCurrency)) {
      res.status(400);
      throw new Error(
        "Base currency must be a 3-letter currency code (e.g. USD)",
      );
    }
    user.baseCurrency = baseCurrency.toUpperCase();
  }
  if (dateFormat !== undefined) {
    if (!["MDY", "DMY", "YMD"].includes(dateFormat)) {
      res.status(400);
      throw new Error("dateFormat must be one of MDY, DMY, YMD");
    }
    user.dateFormat = dateFormat;
  }
  if (accentColor !== undefined) {
    if (accentColor !== null && !user.hasActivePremium()) {
      res.status(402);
      throw new Error("Custom accent color is a Premium feature");
    }
    if (accentColor !== null && !/^#[0-9a-fA-F]{6}$/.test(accentColor)) {
      res.status(400);
      throw new Error("accentColor must be a 6-digit hex color (e.g. #2f4bc0)");
    }
    user.accentColor = accentColor;
  }
  if (emailNotifications !== undefined) {
    if (typeof emailNotifications !== "object" || emailNotifications === null) {
      res.status(400);
      throw new Error("emailNotifications must be an object");
    }
    for (const key of EMAIL_NOTIFICATION_KEYS) {
      if (emailNotifications[key] !== undefined) {
        user.emailNotifications[key] = Boolean(emailNotifications[key]);
      }
    }
  }
  if (roundUpSavings !== undefined) {
    if (typeof roundUpSavings !== "object" || roundUpSavings === null) {
      res.status(400);
      throw new Error("roundUpSavings must be an object");
    }
    if (roundUpSavings.enabled !== undefined) {
      user.roundUpSavings.enabled = Boolean(roundUpSavings.enabled);
    }
    if (roundUpSavings.roundToCents !== undefined) {
      const cents = Number(roundUpSavings.roundToCents);
      if (!Number.isFinite(cents) || cents < 10) {
        res.status(400);
        throw new Error("roundToCents must be at least 10");
      }
      user.roundUpSavings.roundToCents = cents;
    }
    if (roundUpSavings.destinationAccount !== undefined) {
      if (
        roundUpSavings.destinationAccount === null ||
        roundUpSavings.destinationAccount === ""
      ) {
        user.roundUpSavings.destinationAccount = null;
      } else {
        const account = await Account.findOne({
          _id: roundUpSavings.destinationAccount,
          user: user._id,
        });
        if (!account) {
          res.status(400);
          throw new Error("destinationAccount does not exist");
        }
        user.roundUpSavings.destinationAccount = account._id;
      }
    }
    if (
      user.roundUpSavings.enabled &&
      !user.roundUpSavings.destinationAccount
    ) {
      res.status(400);
      throw new Error(
        "Choose a destination account before enabling round-up savings",
      );
    }
  }
  if (scheduledReports !== undefined) {
    if (typeof scheduledReports !== "object" || scheduledReports === null) {
      res.status(400);
      throw new Error("scheduledReports must be an object");
    }
    if (scheduledReports.enabled !== undefined) {
      user.scheduledReports.enabled = Boolean(scheduledReports.enabled);
    }
    if (scheduledReports.frequency !== undefined) {
      if (!["weekly", "monthly"].includes(scheduledReports.frequency)) {
        res.status(400);
        throw new Error("frequency must be 'weekly' or 'monthly'");
      }
      user.scheduledReports.frequency = scheduledReports.frequency;
    }
    if (scheduledReports.dayOfWeek !== undefined) {
      const day = Number(scheduledReports.dayOfWeek);
      if (!Number.isInteger(day) || day < 0 || day > 6) {
        res.status(400);
        throw new Error("dayOfWeek must be an integer 0-6");
      }
      user.scheduledReports.dayOfWeek = day;
    }
    if (scheduledReports.dayOfMonth !== undefined) {
      const day = Number(scheduledReports.dayOfMonth);
      if (!Number.isInteger(day) || day < 1 || day > 28) {
        res.status(400);
        throw new Error("dayOfMonth must be an integer 1-28");
      }
      user.scheduledReports.dayOfMonth = day;
    }
  }
  await user.save();
  res.json({
    user: user.toSafeObject(),
  });
});
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword) {
    res.status(400);
    throw new Error("Current password is required");
  }
  assertStrongPassword(res, newPassword);
  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.matchPassword(currentPassword))) {
    res.status(401);
    throw new Error("Current password is incorrect");
  }
  user.password = newPassword;
  await user.save();
  await RefreshToken.deleteMany({
    user: user._id,
  });
  res.clearCookie(REFRESH_COOKIE, {
    path: "/api/auth",
  });
  res.json({
    message: "Password updated. Please log in again.",
  });
});
export const startTwoFactorSetup = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user.twoFactor.enabled) {
    res.status(409);
    throw new Error("Two-factor authentication is already enabled");
  }
  const secret = generateTotpSecret();
  user.twoFactor.pendingSecret = secret;
  await user.save();
  const setup = await buildSetupPayload(user.email, secret);
  res.json(setup);
});
export const confirmTwoFactorSetup = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const user = await User.findById(req.user._id).select(
    "+twoFactor.pendingSecret",
  );
  if (!user.twoFactor.pendingSecret) {
    res.status(400);
    throw new Error("Start 2FA setup first");
  }
  const ok = await verifyTotp(token, user.twoFactor.pendingSecret);
  if (!ok) {
    res.status(400);
    throw new Error(
      "That code doesn't match. Check your authenticator app and try again.",
    );
  }
  const backupCodes = generateBackupCodes();
  user.twoFactor.secret = user.twoFactor.pendingSecret;
  user.twoFactor.pendingSecret = null;
  user.twoFactor.enabled = true;
  user.twoFactor.backupCodeHashes = backupCodes.map(hashBackupCode);
  await user.save();
  res.json({
    message: "Two-factor authentication enabled",
    backupCodes,
  });
});
export const disableTwoFactor = asyncHandler(async (req, res) => {
  const { password, token } = req.body;
  const user = await User.findById(req.user._id).select(
    "+password +twoFactor.secret +twoFactor.backupCodeHashes",
  );
  if (!password || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Password is incorrect");
  }
  if (!user.twoFactor.enabled) {
    res.status(409);
    throw new Error("Two-factor authentication is not enabled");
  }
  const ok =
    (await verifyTotp(token, user.twoFactor.secret)) ||
    user.twoFactor.backupCodeHashes.includes(hashBackupCode(token));
  if (!ok) {
    res.status(400);
    throw new Error("A valid authenticator code or backup code is required");
  }
  user.twoFactor.enabled = false;
  user.twoFactor.secret = null;
  user.twoFactor.pendingSecret = null;
  user.twoFactor.backupCodeHashes = [];
  await user.save();
  res.json({
    message: "Two-factor authentication disabled",
  });
});
export const regenerateBackupCodes = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const user = await User.findById(req.user._id).select("+twoFactor.secret");
  if (!user.twoFactor.enabled) {
    res.status(409);
    throw new Error("Two-factor authentication is not enabled");
  }
  const ok = await verifyTotp(token, user.twoFactor.secret);
  if (!ok) {
    res.status(400);
    throw new Error(
      "That code doesn't match. Check your authenticator app and try again.",
    );
  }
  const backupCodes = generateBackupCodes();
  user.twoFactor.backupCodeHashes = backupCodes.map(hashBackupCode);
  await user.save();
  res.json({
    backupCodes,
  });
});
export const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const user = await User.findById(req.user._id).select("+password");
  if (!password || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Password is incorrect");
  }
  const userId = user._id;
  const ownedHouseholds = await Household.find({
    owner: userId,
  });
  for (const household of ownedHouseholds) {
    if (household.members.length > 0) {
      const [newOwner, ...remainingMembers] = household.members;
      household.owner = newOwner.user;
      household.members = remainingMembers;
      await household.save();
      await Budget.updateMany(
        {
          household: household._id,
          user: userId,
        },
        {
          user: newOwner.user,
        },
      );
    } else {
      await Budget.deleteMany({
        household: household._id,
      });
      await HouseholdInvite.deleteMany({
        household: household._id,
      });
      await household.deleteOne();
    }
  }
  await Household.updateMany(
    {
      "members.user": userId,
    },
    {
      $pull: {
        members: {
          user: userId,
        },
      },
    },
  );
  const remainingCreated = await Budget.find({
    user: userId,
    household: {
      $ne: null,
    },
  });
  for (const b of remainingCreated) {
    const household = await Household.findById(b.household);
    if (household) {
      b.user = household.owner;
      await b.save();
    }
  }
  await Promise.all([
    Transaction.deleteMany({
      user: userId,
    }),
    Account.deleteMany({
      user: userId,
    }),
    Category.deleteMany({
      user: userId,
    }),
    Budget.deleteMany({
      user: userId,
      household: null,
    }),
    Goal.deleteMany({
      user: userId,
    }),
    Bill.deleteMany({
      user: userId,
    }),
    Notification.deleteMany({
      user: userId,
    }),
    RefreshToken.deleteMany({
      user: userId,
    }),
    HouseholdInvite.deleteMany({
      invitedBy: userId,
    }),
    SplitBill.deleteMany({
      user: userId,
    }),
    Passkey.deleteMany({
      user: userId,
    }),
    PushSubscription.deleteMany({
      user: userId,
    }),
  ]);
  await user.deleteOne();
  res.clearCookie(REFRESH_COOKIE, {
    path: "/api/auth",
  });
  res.json({
    message: "Account and all associated data deleted",
  });
});
export const exportData = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const [accounts, transactions, categories, budgets, goals, bills] =
    await Promise.all([
      Account.find({
        user: userId,
      }),
      Transaction.find({
        user: userId,
      }),
      Category.find({
        user: userId,
      }),
      Budget.find({
        user: userId,
      }),
      Goal.find({
        user: userId,
      }),
      Bill.find({
        user: userId,
      }),
    ]);
  const payload = {
    exportedAt: new Date().toISOString(),
    user: req.user.toSafeObject(),
    accounts,
    transactions,
    categories,
    budgets,
    goals,
    bills,
  };
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=fintrack-data-export.json",
  );
  res.send(JSON.stringify(payload, null, 2));
});
