import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
function rpConfig() {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const { hostname } = new URL(clientUrl);
  return {
    rpName: "FinTrack",
    rpID: hostname,
    origin: clientUrl,
  };
}
export async function buildRegistrationOptions(user, existingPasskeys) {
  const { rpName, rpID } = rpConfig();
  return generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email,
    userDisplayName: user.name,
    userID: new TextEncoder().encode(String(user._id)),
    attestationType: "none",
    excludeCredentials: existingPasskeys.map((p) => ({
      id: p.credentialId,
      transports: p.transports,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });
}
export async function verifyRegistration(response, expectedChallenge) {
  const { origin, rpID } = rpConfig();
  return verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });
}
export async function buildAuthenticationOptions(passkeys) {
  const { rpID } = rpConfig();
  return generateAuthenticationOptions({
    rpID,
    allowCredentials: passkeys.map((p) => ({
      id: p.credentialId,
      transports: p.transports,
    })),
    userVerification: "preferred",
  });
}
export async function verifyAuthentication(
  response,
  expectedChallenge,
  passkey,
) {
  const { origin, rpID } = rpConfig();
  return verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: passkey.credentialId,
      publicKey: new Uint8Array(passkey.publicKey),
      counter: passkey.counter,
      transports: passkey.transports,
    },
  });
}
