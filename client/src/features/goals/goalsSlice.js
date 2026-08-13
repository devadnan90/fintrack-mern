import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { goalsAPI } from "./goalsAPI";
function extractError(err, fallback) {
  return err.response?.data?.message || fallback;
}
export const fetchGoals = createAsyncThunk(
  "goals/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await goalsAPI.list();
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to load goals"));
    }
  },
);
export const createGoal = createAsyncThunk(
  "goals/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await goalsAPI.create(payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to create goal"));
    }
  },
);
export const updateGoal = createAsyncThunk(
  "goals/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await goalsAPI.update(id, payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to update goal"));
    }
  },
);
export const contributeToGoal = createAsyncThunk(
  "goals/contribute",
  async ({ id, amount }, { rejectWithValue }) => {
    try {
      return await goalsAPI.contribute(id, amount);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to log contribution"));
    }
  },
);
export const deleteGoal = createAsyncThunk(
  "goals/delete",
  async (id, { rejectWithValue }) => {
    try {
      await goalsAPI.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to delete goal"));
    }
  },
);
const goalsSlice = createSlice({
  name: "goals",
  initialState: {
    items: [],
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGoals.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchGoals.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchGoals.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(createGoal.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateGoal.fulfilled, (state, action) => {
        const idx = state.items.findIndex((g) => g.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(contributeToGoal.fulfilled, (state, action) => {
        const idx = state.items.findIndex(
          (g) => g.id === action.payload.goal.id,
        );
        if (idx !== -1) state.items[idx] = action.payload.goal;
      })
      .addCase(deleteGoal.fulfilled, (state, action) => {
        state.items = state.items.filter((g) => g.id !== action.payload);
      });
  },
});
export default goalsSlice.reducer;
