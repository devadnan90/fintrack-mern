import asyncHandler from "express-async-handler";
import crypto from "crypto";
import Household from "../models/Household.js";
import HouseholdInvite from "../models/HouseholdInvite.js";
import Budget from "../models/Budget.js";
import User from "../models/User.js";
import { sendMail } from "../utils/mailer.js";
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}
async function serializeHousehold(household, viewerId) {
  const ownerDoc = household.owner.name
    ? household.owner
    : await User.findById(household.owner).select("name email");
  const memberDocs = await User.find({
    _id: {
      $in: household.members.map((m) => m.user),
    },
  }).select("name email");
  const memberById = new Map(memberDocs.map((u) => [String(u._id), u]));
  return {
    id: household._id,
    name: household.name,
    isOwner:
      String(household.owner._id || household.owner) === String(viewerId),
    owner: {
      id: ownerDoc._id,
      name: ownerDoc.name,
      email: ownerDoc.email,
    },
    members: household.members.map((m) => {
      const u = memberById.get(String(m.user));
      return {
        id: m.user,
        name: u?.name || "Unknown",
        email: u?.email || "",
        joinedAt: m.joinedAt,
      };
    }),
    createdAt: household.createdAt,
  };
}
export const listHouseholds = asyncHandler(async (req, res) => {
  const households = await Household.find({
    $or: [
      {
        owner: req.user._id,
      },
      {
        "members.user": req.user._id,
      },
    ],
  }).populate("owner", "name email");
  const serialized = await Promise.all(
    households.map((h) => serializeHousehold(h, req.user._id)),
  );
  res.json({
    households: serialized,
  });
});
export const createHousehold = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    res.status(400);
    throw new Error("name is required");
  }
  const household = await Household.create({
    name: name.trim(),
    owner: req.user._id,
    members: [],
  });
  await household.populate("owner", "name email");
  res.status(201).json({
    household: await serializeHousehold(household, req.user._id),
  });
});
export const deleteHousehold = asyncHandler(async (req, res) => {
  const household = await Household.findOne({
    _id: req.params.id,
    owner: req.user._id,
  });
  if (!household) {
    res.status(404);
    throw new Error("Household not found");
  }
  await Promise.all([
    Budget.deleteMany({
      household: household._id,
    }),
    HouseholdInvite.deleteMany({
      household: household._id,
    }),
    household.deleteOne(),
  ]);
  res.json({
    message: "Household deleted",
  });
});
export const leaveHousehold = asyncHandler(async (req, res) => {
  const household = await Household.findById(req.params.id);
  if (!household) {
    res.status(404);
    throw new Error("Household not found");
  }
  if (String(household.owner) === String(req.user._id)) {
    res.status(400);
    throw new Error("As the owner, delete the household instead of leaving it");
  }
  household.members = household.members.filter(
    (m) => String(m.user) !== String(req.user._id),
  );
  await household.save();
  res.json({
    message: "Left household",
  });
});
export const removeMember = asyncHandler(async (req, res) => {
  const household = await Household.findOne({
    _id: req.params.id,
    owner: req.user._id,
  });
  if (!household) {
    res.status(404);
    throw new Error("Household not found");
  }
  household.members = household.members.filter(
    (m) => String(m.user) !== req.params.userId,
  );
  await household.save();
  res.json({
    message: "Member removed",
  });
});
export const inviteMember = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim()) {
    res.status(400);
    throw new Error("email is required");
  }
  const normalizedEmail = email.trim().toLowerCase();
  const household = await Household.findOne({
    _id: req.params.id,
    owner: req.user._id,
  });
  if (!household) {
    res.status(404);
    throw new Error("Household not found");
  }
  if (normalizedEmail === req.user.email) {
    res.status(400);
    throw new Error("You're already the owner of this household");
  }
  const existingMember = await User.findOne({
    email: normalizedEmail,
  });
  if (existingMember && household.isMember(existingMember._id)) {
    res.status(409);
    throw new Error("That person is already a member");
  }
  await HouseholdInvite.deleteMany({
    household: household._id,
    email: normalizedEmail,
  });
  const rawToken = crypto.randomBytes(32).toString("hex");
  await HouseholdInvite.create({
    household: household._id,
    email: normalizedEmail,
    invitedBy: req.user._id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });
  const inviteUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/households?token=${rawToken}`;
  await sendMail({
    to: normalizedEmail,
    subject: `${req.user.name} invited you to a FinTrack household`,
    text: `${req.user.name} invited you to join "${household.name}" on FinTrack to share budgets.\n\nAccept the invite here (expires in 7 days): ${inviteUrl}\n\nIf you don't have a FinTrack account yet, sign up with this email address first, then open the link again.`,
    html: `<p>${req.user.name} invited you to join "<strong>${household.name}</strong>" on FinTrack to share budgets.</p><p><a href="${inviteUrl}">Accept the invite</a> (expires in 7 days).</p><p>If you don't have a FinTrack account yet, sign up with this email address first, then open the link again.</p>`,
  });
  res.status(201).json({
    message: `Invite sent to ${normalizedEmail}`,
  });
});
export const listMyInvites = asyncHandler(async (req, res) => {
  const invites = await HouseholdInvite.find({
    email: req.user.email,
    expiresAt: {
      $gt: new Date(),
    },
  }).populate({
    path: "household",
    select: "name owner",
    populate: {
      path: "owner",
      select: "name",
    },
  });
  res.json({
    invites: invites.map((inv) => ({
      id: inv._id,
      household: {
        id: inv.household._id,
        name: inv.household.name,
        ownerName: inv.household.owner?.name || "",
      },
      expiresAt: inv.expiresAt,
    })),
  });
});
export const acceptInvite = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(400);
    throw new Error("token is required");
  }
  const invite = await HouseholdInvite.findOne({
    tokenHash: hashToken(token),
    expiresAt: {
      $gt: new Date(),
    },
  });
  if (!invite) {
    res.status(400);
    throw new Error("This invite is invalid or has expired");
  }
  if (invite.email !== req.user.email) {
    res.status(403);
    throw new Error("This invite was sent to a different email address");
  }
  const household = await Household.findById(invite.household);
  if (!household) {
    res.status(404);
    throw new Error("Household no longer exists");
  }
  if (!household.isMember(req.user._id)) {
    household.members.push({
      user: req.user._id,
      joinedAt: new Date(),
    });
    await household.save();
  }
  await invite.deleteOne();
  res.json({
    message: `Joined "${household.name}"`,
    householdId: household._id,
  });
});
