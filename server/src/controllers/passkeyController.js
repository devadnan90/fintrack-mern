import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Passkey from "../models/Passkey.js";
import {
  buildRegistrationOptions,
  verifyRegistration,
} from "../utils/webauthn.js";
function serializePasskey(passkey) {
  return {
    id: passkey._id,
    name: passkey.name,
    deviceType: passkey.deviceType,
    createdAt: passkey.createdAt,
    lastUsedAt: passkey.lastUsedAt,
  };
}
export const listPasskeys = asyncHandler(async (req, res) => {
  const passkeys = await Passkey.find({
    user: req.user._id,
  }).sort({
    createdAt: -1,
  });
  res.json({
    passkeys: passkeys.map(serializePasskey),
  });
});
export const startPasskeyRegistration = asyncHandler(async (req, res) => {
  const existing = await Passkey.find({
    user: req.user._id,
  });
  const options = await buildRegistrationOptions(req.user, existing);
  await User.updateOne(
    {
      _id: req.user._id,
    },
    {
      currentChallenge: options.challenge,
    },
  );
  res.json(options);
});
export const finishPasskeyRegistration = asyncHandler(async (req, res) => {
  const { response, name } = req.body;
  const user = await User.findById(req.user._id).select("+currentChallenge");
  if (!user.currentChallenge) {
    res.status(400);
    throw new Error("Start passkey registration first");
  }
  let verification;
  try {
    verification = await verifyRegistration(response, user.currentChallenge);
  } catch (err) {
    res.status(400);
    throw new Error(`Passkey registration failed: ${err.message}`);
  }
  if (!verification.verified || !verification.registrationInfo) {
    res.status(400);
    throw new Error("Passkey registration could not be verified");
  }
  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;
  const passkey = await Passkey.create({
    user: req.user._id,
    credentialId: credential.id,
    publicKey: Buffer.from(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports || [],
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    name: name?.trim() || "Passkey",
  });
  user.currentChallenge = null;
  await user.save();
  res.status(201).json({
    passkey: serializePasskey(passkey),
  });
});
export const deletePasskey = asyncHandler(async (req, res) => {
  const passkey = await Passkey.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!passkey) {
    res.status(404);
    throw new Error("Passkey not found");
  }
  await passkey.deleteOne();
  res.json({
    message: "Passkey removed",
  });
});
