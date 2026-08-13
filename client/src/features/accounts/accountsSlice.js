import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { accountsAPI } from "./accountsAPI";
function extractError(err, fallback) {
  return err.response?.data?.message || fallback;
}
export const fetchAccounts = createAsyncThunk(
  "accounts/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await accountsAPI.list();
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to load accounts"));
    }
  },
);
export const createAccount = createAsyncThunk(
  "accounts/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await accountsAPI.create(payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to create account"));
    }
  },
);
export const updateAccount = createAsyncThunk(
  "accounts/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await accountsAPI.update(id, payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to update account"));
    }
  },
);
export const deleteAccount = createAsyncThunk(
  "accounts/delete",
  async (id, { rejectWithValue }) => {
    try {
      await accountsAPI.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to delete account"));
    }
  },
);
const accountsSlice = createSlice({
  name: "accounts",
  initialState: {
    items: [],
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAccounts.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchAccounts.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchAccounts.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(createAccount.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateAccount.fulfilled, (state, action) => {
        const idx = state.items.findIndex((a) => a.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteAccount.fulfilled, (state, action) => {
        state.items = state.items.filter((a) => a.id !== action.payload);
      });
  },
});
export default accountsSlice.reducer;
