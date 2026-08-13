import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { budgetsAPI } from "./budgetsAPI";
function extractError(err, fallback) {
  return err.response?.data?.message || fallback;
}
export const fetchBudgets = createAsyncThunk(
  "budgets/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await budgetsAPI.list();
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to load budgets"));
    }
  },
);
export const createBudget = createAsyncThunk(
  "budgets/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await budgetsAPI.create(payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to create budget"));
    }
  },
);
export const updateBudget = createAsyncThunk(
  "budgets/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await budgetsAPI.update(id, payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to update budget"));
    }
  },
);
export const deleteBudget = createAsyncThunk(
  "budgets/delete",
  async (id, { rejectWithValue }) => {
    try {
      await budgetsAPI.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to delete budget"));
    }
  },
);
const budgetsSlice = createSlice({
  name: "budgets",
  initialState: {
    items: [],
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBudgets.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchBudgets.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchBudgets.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(createBudget.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateBudget.fulfilled, (state, action) => {
        const idx = state.items.findIndex((b) => b.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteBudget.fulfilled, (state, action) => {
        state.items = state.items.filter((b) => b.id !== action.payload);
      });
  },
});
export default budgetsSlice.reducer;
