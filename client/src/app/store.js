import { configureStore } from "@reduxjs/toolkit";
import authReducer, { sessionExpired } from "../features/auth/authSlice";
import accountsReducer from "../features/accounts/accountsSlice";
import categoriesReducer from "../features/categories/categoriesSlice";
import transactionsReducer from "../features/transactions/transactionsSlice";
import investmentsReducer from "../features/investments/investmentsSlice";
import budgetsReducer from "../features/budgets/budgetsSlice";
import goalsReducer from "../features/goals/goalsSlice";
import billsReducer from "../features/bills/billsSlice";
import recurringTransactionsReducer from "../features/recurringTransactions/recurringTransactionsSlice";
import debtsReducer from "../features/debts/debtsSlice";
import merchantRulesReducer from "../features/merchantRules/merchantRulesSlice";
import householdsReducer from "../features/households/householdsSlice";
import splitBillsReducer from "../features/splitBills/splitBillsSlice";
import budgetTemplatesReducer from "../features/budgetTemplates/budgetTemplatesSlice";
import { setUnauthorizedHandler } from "../services/api";
export const store = configureStore({
  reducer: {
    auth: authReducer,
    accounts: accountsReducer,
    categories: categoriesReducer,
    transactions: transactionsReducer,
    investments: investmentsReducer,
    budgets: budgetsReducer,
    goals: goalsReducer,
    bills: billsReducer,
    recurringTransactions: recurringTransactionsReducer,
    debts: debtsReducer,
    merchantRules: merchantRulesReducer,
    households: householdsReducer,
    splitBills: splitBillsReducer,
    budgetTemplates: budgetTemplatesReducer,
  },
});
setUnauthorizedHandler(() => store.dispatch(sessionExpired()));
export default store;
