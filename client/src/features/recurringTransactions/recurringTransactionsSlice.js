import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { recurringTransactionsAPI } from "./recurringTransactionsAPI";
function extractError(err, fallback) {
  return err.response?.data?.message || fallback;
}
export const fetchRecurringTransactions = createAsyncThunk(
  "recurringTransactions/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await recurringTransactionsAPI.list();
    } catch (err) {
      return rejectWithValue(
        extractError(err, "Failed to load recurring transactions"),
      );
    }
  },
);
export const createRecurringTransaction = createAsyncThunk(
  "recurringTransactions/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await recurringTransactionsAPI.create(payload);
    } catch (err) {
      return rejectWithValue(
        extractError(err, "Failed to create recurring transaction"),
      );
    }
  },
);
export const updateRecurringTransaction = createAsyncThunk(
  "recurringTransactions/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await recurringTransactionsAPI.update(id, payload);
    } catch (err) {
      return rejectWithValue(
        extractError(err, "Failed to update recurring transaction"),
      );
    }
  },
);
export const deleteRecurringTransaction = createAsyncThunk(
  "recurringTransactions/delete",
  async (id, { rejectWithValue }) => {
    try {
      await recurringTransactionsAPI.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(
        extractError(err, "Failed to delete recurring transaction"),
      );
    }
  },
);
const recurringTransactionsSlice = createSlice({
  name: "recurringTransactions",
  initialState: {
    items: [],
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecurringTransactions.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchRecurringTransactions.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchRecurringTransactions.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(createRecurringTransaction.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateRecurringTransaction.fulfilled, (state, action) => {
        const idx = state.items.findIndex((t) => t.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteRecurringTransaction.fulfilled, (state, action) => {
        state.items = state.items.filter((t) => t.id !== action.payload);
      });
  },
});
export default recurringTransactionsSlice.reducer;
