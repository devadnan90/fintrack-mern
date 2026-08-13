export function assertStrongPassword(res, password) {
  if (!password || password.length < 8) {
    res.status(400);
    throw new Error("Password must be at least 8 characters");
  }
  if (!/\d/.test(password)) {
    res.status(400);
    throw new Error("Password must contain at least one number");
  }
}
