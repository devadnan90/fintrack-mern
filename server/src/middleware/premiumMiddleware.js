export function requirePremium(req, res, next) {
  if (!req.user.hasActivePremium()) {
    res.status(402);
    throw new Error("This feature requires FinTrack Premium.");
  }
  next();
}
