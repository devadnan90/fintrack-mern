import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { merchantRulesAPI } from "./merchantRulesAPI";
function extractError(err, fallback) {
  return err.response?.data?.message || fallback;
}
export const fetchMerchantRules = createAsyncThunk(
  "merchantRules/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await merchantRulesAPI.list();
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to load rules"));
    }
  },
);
export const createMerchantRule = createAsyncThunk(
  "merchantRules/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await merchantRulesAPI.create(payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to create rule"));
    }
  },
);
export const updateMerchantRule = createAsyncThunk(
  "merchantRules/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await merchantRulesAPI.update(id, payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to update rule"));
    }
  },
);
export const deleteMerchantRule = createAsyncThunk(
  "merchantRules/delete",
  async (id, { rejectWithValue }) => {
    try {
      await merchantRulesAPI.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to delete rule"));
    }
  },
);
export const applyMerchantRule = createAsyncThunk(
  "merchantRules/apply",
  async (id, { rejectWithValue }) => {
    try {
      return await merchantRulesAPI.apply(id);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to apply rule"));
    }
  },
);
const merchantRulesSlice = createSlice({
  name: "merchantRules",
  initialState: {
    items: [],
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMerchantRules.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchMerchantRules.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchMerchantRules.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(createMerchantRule.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateMerchantRule.fulfilled, (state, action) => {
        const idx = state.items.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteMerchantRule.fulfilled, (state, action) => {
        state.items = state.items.filter((r) => r.id !== action.payload);
      });
  },
});
export default merchantRulesSlice.reducer;
