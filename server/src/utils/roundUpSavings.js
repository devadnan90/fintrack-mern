import Account from "../models/Account.js";
import Transaction from "../models/Transaction.js";
export function computeRoundUp(amountCents, roundToCents) {
  const remainder = amountCents % roundToCents;
  return remainder === 0 ? 0 : roundToCents - remainder;
}
export async function applyRoundUp(user, transaction) {
  const settings = user.roundUpSavings;
  if (!settings?.enabled || !settings.destinationAccount) return null;
  if (transaction.type !== "expense") return null;
  if (transaction.splits?.length > 0) return null;
  if (String(transaction.account) === String(settings.destinationAccount))
    return null;
  const roundToCents = settings.roundToCents || 100;
  const roundUpCents = computeRoundUp(transaction.amount, roundToCents);
  if (roundUpCents <= 0) return null;
  const destination = await Account.findOne({
    _id: settings.destinationAccount,
    user: user._id,
  });
  if (!destination) return null;
  return Transaction.create({
    user: user._id,
    account: transaction.account,
    toAccount: destination._id,
    type: "transfer",
    amount: roundUpCents,
    date: transaction.date,
    description: `Round-up savings from "${transaction.description || "a purchase"}"`,
    roundUpSourceTransaction: transaction._id,
  });
}
