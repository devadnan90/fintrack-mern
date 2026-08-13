import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { billsAPI } from "./billsAPI";
function extractError(err, fallback) {
  return err.response?.data?.message || fallback;
}
export const fetchBills = createAsyncThunk(
  "bills/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await billsAPI.list();
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to load bills"));
    }
  },
);
export const createBill = createAsyncThunk(
  "bills/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await billsAPI.create(payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to create bill"));
    }
  },
);
export const payBill = createAsyncThunk(
  "bills/pay",
  async (id, { rejectWithValue }) => {
    try {
      return await billsAPI.pay(id);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to mark bill paid"));
    }
  },
);
export const deleteBill = createAsyncThunk(
  "bills/delete",
  async (id, { rejectWithValue }) => {
    try {
      await billsAPI.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to delete bill"));
    }
  },
);
const billsSlice = createSlice({
  name: "bills",
  initialState: {
    items: [],
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBills.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchBills.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchBills.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(createBill.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(payBill.fulfilled, (state, action) => {
        const idx = state.items.findIndex(
          (b) => b.id === action.payload.bill.id,
        );
        if (idx !== -1) state.items[idx] = action.payload.bill;
      })
      .addCase(deleteBill.fulfilled, (state, action) => {
        state.items = state.items.filter((b) => b.id !== action.payload);
      });
  },
});
export default billsSlice.reducer;
