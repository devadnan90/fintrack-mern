import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { investmentsAPI } from "./investmentsAPI";
function extractError(err, fallback) {
  return err.response?.data?.message || fallback;
}
export const fetchInvestments = createAsyncThunk(
  "investments/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await investmentsAPI.list();
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to load investments"));
    }
  },
);
export const createInvestment = createAsyncThunk(
  "investments/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await investmentsAPI.create(payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to create investment"));
    }
  },
);
export const updateInvestment = createAsyncThunk(
  "investments/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await investmentsAPI.update(id, payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to update investment"));
    }
  },
);
export const deleteInvestment = createAsyncThunk(
  "investments/delete",
  async (id, { rejectWithValue }) => {
    try {
      await investmentsAPI.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to delete investment"));
    }
  },
);
const investmentsSlice = createSlice({
  name: "investments",
  initialState: {
    items: [],
    portfolio: {
      currentValue: 0,
      costBasis: 0,
      gainLoss: 0,
    },
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvestments.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchInvestments.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.investments;
        state.portfolio = action.payload.portfolio;
      })
      .addCase(fetchInvestments.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(createInvestment.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateInvestment.fulfilled, (state, action) => {
        const idx = state.items.findIndex((i) => i.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteInvestment.fulfilled, (state, action) => {
        state.items = state.items.filter((i) => i.id !== action.payload);
      });
  },
});
export default investmentsSlice.reducer;
