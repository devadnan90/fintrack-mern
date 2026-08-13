import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { budgetTemplatesAPI } from "./budgetTemplatesAPI";
function extractError(err, fallback) {
  return err.response?.data?.message || fallback;
}
export const fetchBudgetTemplates = createAsyncThunk(
  "budgetTemplates/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await budgetTemplatesAPI.list();
    } catch (err) {
      return rejectWithValue(
        extractError(err, "Failed to load budget templates"),
      );
    }
  },
);
export const createBudgetTemplate = createAsyncThunk(
  "budgetTemplates/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await budgetTemplatesAPI.create(payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to save template"));
    }
  },
);
export const deleteBudgetTemplate = createAsyncThunk(
  "budgetTemplates/delete",
  async (id, { rejectWithValue }) => {
    try {
      await budgetTemplatesAPI.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to delete template"));
    }
  },
);
export const applyBudgetTemplate = createAsyncThunk(
  "budgetTemplates/apply",
  async (id, { rejectWithValue }) => {
    try {
      return await budgetTemplatesAPI.apply(id);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to apply template"));
    }
  },
);
const budgetTemplatesSlice = createSlice({
  name: "budgetTemplates",
  initialState: {
    items: [],
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBudgetTemplates.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchBudgetTemplates.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchBudgetTemplates.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(createBudgetTemplate.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(deleteBudgetTemplate.fulfilled, (state, action) => {
        state.items = state.items.filter((t) => t.id !== action.payload);
      });
  },
});
export default budgetTemplatesSlice.reducer;
