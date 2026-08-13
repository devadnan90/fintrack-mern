import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { transactionsAPI } from "./transactionsAPI";
function extractError(err, fallback) {
  return err.response?.data?.message || fallback;
}
export const fetchTransactions = createAsyncThunk(
  "transactions/fetchAll",
  async (params, { rejectWithValue }) => {
    try {
      return await transactionsAPI.list(params);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to load transactions"));
    }
  },
);
export const createTransaction = createAsyncThunk(
  "transactions/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await transactionsAPI.create(payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to create transaction"));
    }
  },
);
export const updateTransaction = createAsyncThunk(
  "transactions/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await transactionsAPI.update(id, payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to update transaction"));
    }
  },
);
export const deleteTransaction = createAsyncThunk(
  "transactions/delete",
  async (id, { rejectWithValue }) => {
    try {
      await transactionsAPI.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to delete transaction"));
    }
  },
);
export const bulkDeleteTransactions = createAsyncThunk(
  "transactions/bulkDelete",
  async (ids, { rejectWithValue }) => {
    try {
      return await transactionsAPI.bulkDelete(ids);
    } catch (err) {
      return rejectWithValue(
        extractError(err, "Failed to delete transactions"),
      );
    }
  },
);
export const bulkUpdateTransactions = createAsyncThunk(
  "transactions/bulkUpdate",
  async (payload, { rejectWithValue }) => {
    try {
      return await transactionsAPI.bulkUpdate(payload);
    } catch (err) {
      return rejectWithValue(
        extractError(err, "Failed to update transactions"),
      );
    }
  },
);
export const restoreTransaction = createAsyncThunk(
  "transactions/restore",
  async (id, { rejectWithValue }) => {
    try {
      return await transactionsAPI.restore(id);
    } catch (err) {
      return rejectWithValue(
        extractError(err, "Failed to restore transaction"),
      );
    }
  },
);
export const bulkRestoreTransactions = createAsyncThunk(
  "transactions/bulkRestore",
  async (ids, { rejectWithValue }) => {
    try {
      return await transactionsAPI.bulkRestore(ids);
    } catch (err) {
      return rejectWithValue(
        extractError(err, "Failed to restore transactions"),
      );
    }
  },
);
const transactionsSlice = createSlice({
  name: "transactions",
  initialState: {
    items: [],
    pagination: {
      page: 1,
      limit: 25,
      total: 0,
      totalPages: 1,
    },
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.transactions;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(createTransaction.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateTransaction.fulfilled, (state, action) => {
        const idx = state.items.findIndex((t) => t.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteTransaction.fulfilled, (state, action) => {
        state.items = state.items.filter((t) => t.id !== action.payload);
      });
  },
});
export default transactionsSlice.reducer;
