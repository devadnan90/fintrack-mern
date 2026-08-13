import RecurringTransaction from "../models/RecurringTransaction.js";
import Transaction from "../models/Transaction.js";
import { nextOccurrence } from "./recurrence.js";
const MAX_OCCURRENCES_PER_RUN = 24;
export async function generateDueRecurringTransactions(userId) {
  const now = new Date();
  const templates = await RecurringTransaction.find({
    user: userId,
    isActive: true,
    nextDueDate: {
      $lte: now,
    },
  });
  for (const template of templates) {
    let count = 0;
    while (template.nextDueDate <= now && count < MAX_OCCURRENCES_PER_RUN) {
      if (template.endDate && template.nextDueDate > template.endDate) break;
      await Transaction.create({
        user: userId,
        account: template.account,
        toAccount: template.toAccount,
        category: template.category,
        type: template.type,
        amount: template.amount,
        date: template.nextDueDate,
        description: template.description,
        tags: template.tags,
        generatedFrom: template._id,
      });
      const next = nextOccurrence(template.nextDueDate, template.recurrence);
      if (!next) break;
      template.nextDueDate = next;
      count += 1;
    }
    template.lastGeneratedAt = now;
    if (template.endDate && template.nextDueDate > template.endDate) {
      template.isActive = false;
    }
    await template.save();
  }
}
