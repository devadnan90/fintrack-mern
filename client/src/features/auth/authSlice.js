import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authAPI } from "./authAPI";
import { usersAPI } from "../users/usersAPI";
import { paymentsAPI } from "../payments/paymentsAPI";
import { setAccessToken } from "../../services/api";
function extractError(err, fallback) {
  return err.response?.data?.message || fallback;
}
export const verifyTwoFactorLogin = createAsyncThunk(
  "auth/verifyTwoFactorLogin",
  async (payload, { rejectWithValue }) => {
    try {
      return await authAPI.verifyTwoFactorLogin(payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Invalid or expired code"));
    }
  },
);
export const passkeyLogin = createAsyncThunk(
  "auth/passkeyLogin",
  async (payload, { rejectWithValue }) => {
    try {
      return await authAPI.passkeyLoginVerify(payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Passkey login failed"));
    }
  },
);
export const registerUser = createAsyncThunk(
  "auth/register",
  async (payload, { rejectWithValue }) => {
    try {
      return await authAPI.register(payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Registration failed"));
    }
  },
);
export const loginUser = createAsyncThunk(
  "auth/login",
  async (payload, { rejectWithValue }) => {
    try {
      return await authAPI.login(payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Login failed"));
    }
  },
);
export const restoreSession = createAsyncThunk(
  "auth/restore",
  async (_, { rejectWithValue }) => {
    try {
      return await authAPI.refresh();
    } catch (err) {
      return rejectWithValue(null);
    }
  },
);
export const logoutUser = createAsyncThunk("auth/logout", async () => {
  await authAPI.logout();
});
export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (payload, { rejectWithValue }) => {
    try {
      return await usersAPI.updateProfile(payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to update profile"));
    }
  },
);
export const changePassword = createAsyncThunk(
  "auth/changePassword",
  async (payload, { rejectWithValue }) => {
    try {
      return await usersAPI.changePassword(payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to change password"));
    }
  },
);
export const confirmTwoFactorSetup = createAsyncThunk(
  "auth/confirmTwoFactorSetup",
  async (token, { rejectWithValue }) => {
    try {
      return await usersAPI.confirmTwoFactorSetup(token);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to confirm 2FA setup"));
    }
  },
);
export const disableTwoFactorAuth = createAsyncThunk(
  "auth/disableTwoFactorAuth",
  async (payload, { rejectWithValue }) => {
    try {
      return await usersAPI.disableTwoFactor(payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to disable 2FA"));
    }
  },
);
export const deleteAccount = createAsyncThunk(
  "auth/deleteAccount",
  async (password, { rejectWithValue }) => {
    try {
      return await usersAPI.deleteAccount(password);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to delete account"));
    }
  },
);
export const verifyPremiumPayment = createAsyncThunk(
  "auth/verifyPremiumPayment",
  async (payload, { rejectWithValue }) => {
    try {
      return await paymentsAPI.verify(payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Payment verification failed"));
    }
  },
);
export const forgotPassword = createAsyncThunk(
  "auth/forgotPassword",
  async (email, { rejectWithValue }) => {
    try {
      return await authAPI.forgotPassword(email);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to send reset email"));
    }
  },
);
export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async (payload, { rejectWithValue }) => {
    try {
      return await authAPI.resetPassword(payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to reset password"));
    }
  },
);
const initialState = {
  user: null,
  status: "idle",
  initialized: false,
  error: null,
  twoFactorPending: null,
};
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    sessionExpired(state) {
      state.user = null;
    },
    cancelTwoFactorLogin(state) {
      state.twoFactorPending = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload.user;
        setAccessToken(action.payload.accessToken);
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
        state.twoFactorPending = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        if (action.payload.requiresTwoFactor) {
          state.status = "idle";
          state.twoFactorPending = {
            twoFactorToken: action.payload.twoFactorToken,
          };
          return;
        }
        state.status = "succeeded";
        state.user = action.payload.user;
        setAccessToken(action.payload.accessToken);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(verifyTwoFactorLogin.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(verifyTwoFactorLogin.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload.user;
        state.twoFactorPending = null;
        setAccessToken(action.payload.accessToken);
      })
      .addCase(verifyTwoFactorLogin.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(passkeyLogin.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(passkeyLogin.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload.user;
        setAccessToken(action.payload.accessToken);
      })
      .addCase(passkeyLogin.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.initialized = true;
        setAccessToken(action.payload.accessToken);
      })
      .addCase(restoreSession.rejected, (state) => {
        state.user = null;
        state.initialized = true;
        setAccessToken(null);
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        setAccessToken(null);
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload.user;
      })
      .addCase(verifyPremiumPayment.fulfilled, (state, action) => {
        state.user = action.payload.user;
      })
      .addCase(confirmTwoFactorSetup.fulfilled, (state) => {
        if (state.user) state.user.twoFactorEnabled = true;
      })
      .addCase(disableTwoFactorAuth.fulfilled, (state) => {
        if (state.user) state.user.twoFactorEnabled = false;
      })
      .addCase(deleteAccount.fulfilled, (state) => {
        state.user = null;
        setAccessToken(null);
      });
  },
});
export const { sessionExpired, cancelTwoFactorLogin } = authSlice.actions;
export default authSlice.reducer;
