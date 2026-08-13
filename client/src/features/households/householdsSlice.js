import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { householdsAPI } from "./householdsAPI";
function extractError(err, fallback) {
  return err.response?.data?.message || fallback;
}
export const fetchHouseholds = createAsyncThunk(
  "households/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await householdsAPI.list();
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to load households"));
    }
  },
);
export const fetchMyInvites = createAsyncThunk(
  "households/fetchMyInvites",
  async (_, { rejectWithValue }) => {
    try {
      return await householdsAPI.myInvites();
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to load invites"));
    }
  },
);
export const createHousehold = createAsyncThunk(
  "households/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await householdsAPI.create(payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to create household"));
    }
  },
);
export const deleteHousehold = createAsyncThunk(
  "households/delete",
  async (id, { rejectWithValue }) => {
    try {
      await householdsAPI.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to delete household"));
    }
  },
);
export const leaveHousehold = createAsyncThunk(
  "households/leave",
  async (id, { rejectWithValue }) => {
    try {
      await householdsAPI.leave(id);
      return id;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to leave household"));
    }
  },
);
export const removeHouseholdMember = createAsyncThunk(
  "households/removeMember",
  async ({ id, userId }, { rejectWithValue }) => {
    try {
      await householdsAPI.removeMember(id, userId);
      return {
        id,
        userId,
      };
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to remove member"));
    }
  },
);
export const inviteToHousehold = createAsyncThunk(
  "households/invite",
  async ({ id, email }, { rejectWithValue }) => {
    try {
      return await householdsAPI.invite(id, email);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to send invite"));
    }
  },
);
export const acceptHouseholdInvite = createAsyncThunk(
  "households/acceptInvite",
  async (token, { rejectWithValue }) => {
    try {
      return await householdsAPI.acceptInvite(token);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to accept invite"));
    }
  },
);
const householdsSlice = createSlice({
  name: "households",
  initialState: {
    items: [],
    invites: [],
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHouseholds.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchHouseholds.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchHouseholds.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(fetchMyInvites.fulfilled, (state, action) => {
        state.invites = action.payload;
      })
      .addCase(createHousehold.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(deleteHousehold.fulfilled, (state, action) => {
        state.items = state.items.filter((h) => h.id !== action.payload);
      })
      .addCase(leaveHousehold.fulfilled, (state, action) => {
        state.items = state.items.filter((h) => h.id !== action.payload);
      })
      .addCase(removeHouseholdMember.fulfilled, (state, action) => {
        const household = state.items.find((h) => h.id === action.payload.id);
        if (household)
          household.members = household.members.filter(
            (m) => m.id !== action.payload.userId,
          );
      })
      .addCase(acceptHouseholdInvite.fulfilled, (state, action) => {
        state.invites = state.invites.filter(
          (inv) => inv.household.id !== action.payload.householdId,
        );
      });
  },
});
export default householdsSlice.reducer;
