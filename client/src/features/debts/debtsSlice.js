import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { debtsAPI } from "./debtsAPI";
function extractError(err, fallback) {
  return err.response?.data?.message || fallback;
}
export const fetchDebts = createAsyncThunk(
  "debts/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await debtsAPI.list();
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to load debts"));
    }
  },
);
export const createDebt = createAsyncThunk(
  "debts/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await debtsAPI.create(payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to add debt"));
    }
  },
);
export const updateDebt = createAsyncThunk(
  "debts/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await debtsAPI.update(id, payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to update debt"));
    }
  },
);
export const deleteDebt = createAsyncThunk(
  "debts/delete",
  async (id, { rejectWithValue }) => {
    try {
      await debtsAPI.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to delete debt"));
    }
  },
);
const debtsSlice = createSlice({
  name: "debts",
  initialState: {
    items: [],
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDebts.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchDebts.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchDebts.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(createDebt.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateDebt.fulfilled, (state, action) => {
        const idx = state.items.findIndex((d) => d.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteDebt.fulfilled, (state, action) => {
        state.items = state.items.filter((d) => d.id !== action.payload);
      });
  },
});
export default debtsSlice.reducer;
