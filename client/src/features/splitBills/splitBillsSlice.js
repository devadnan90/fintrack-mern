import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { splitBillsAPI } from "./splitBillsAPI";
function extractError(err, fallback) {
  return err.response?.data?.message || fallback;
}
export const fetchSplitBills = createAsyncThunk(
  "splitBills/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await splitBillsAPI.list();
    } catch (err) {
      return rejectWithValue(
        extractError(err, "Failed to load shared expenses"),
      );
    }
  },
);
export const createSplitBill = createAsyncThunk(
  "splitBills/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await splitBillsAPI.create(payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to create split"));
    }
  },
);
export const updateSplitBill = createAsyncThunk(
  "splitBills/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await splitBillsAPI.update(id, payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to update split"));
    }
  },
);
export const deleteSplitBill = createAsyncThunk(
  "splitBills/delete",
  async (id, { rejectWithValue }) => {
    try {
      await splitBillsAPI.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to delete split"));
    }
  },
);
export const settleParticipant = createAsyncThunk(
  "splitBills/settleParticipant",
  async ({ id, participantId, recordAsIncome }, { rejectWithValue }) => {
    try {
      return await splitBillsAPI.settleParticipant(
        id,
        participantId,
        recordAsIncome,
      );
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to mark as paid"));
    }
  },
);
const splitBillsSlice = createSlice({
  name: "splitBills",
  initialState: {
    items: [],
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSplitBills.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchSplitBills.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchSplitBills.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(createSplitBill.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateSplitBill.fulfilled, (state, action) => {
        const idx = state.items.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteSplitBill.fulfilled, (state, action) => {
        state.items = state.items.filter((s) => s.id !== action.payload);
      })
      .addCase(settleParticipant.fulfilled, (state, action) => {
        const idx = state.items.findIndex(
          (s) => s.id === action.payload.split.id,
        );
        if (idx !== -1) state.items[idx] = action.payload.split;
      });
  },
});
export default splitBillsSlice.reducer;
