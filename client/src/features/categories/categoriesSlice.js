import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { categoriesAPI } from "./categoriesAPI";
function extractError(err, fallback) {
  return err.response?.data?.message || fallback;
}
export const fetchCategories = createAsyncThunk(
  "categories/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await categoriesAPI.list();
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to load categories"));
    }
  },
);
export const createCategory = createAsyncThunk(
  "categories/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await categoriesAPI.create(payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to create category"));
    }
  },
);
export const updateCategory = createAsyncThunk(
  "categories/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await categoriesAPI.update(id, payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to update category"));
    }
  },
);
export const deleteCategory = createAsyncThunk(
  "categories/delete",
  async ({ id, reassignTo }, { rejectWithValue }) => {
    try {
      await categoriesAPI.remove(id, reassignTo);
      return id;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to delete category"));
    }
  },
);
const categoriesSlice = createSlice({
  name: "categories",
  initialState: {
    items: [],
    status: "idle",
    error: null,
    customCategoryLimit: null,
    customCategoryCount: 0,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.categories;
        state.customCategoryLimit = action.payload.customCategoryLimit ?? null;
        state.customCategoryCount = action.payload.customCategoryCount ?? 0;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.items.push(action.payload);
        if (!action.payload.isDefault) state.customCategoryCount += 1;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        const idx = state.items.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        const removed = state.items.find((c) => c.id === action.payload);
        state.items = state.items.filter((c) => c.id !== action.payload);
        if (removed && !removed.isDefault) {
          state.customCategoryCount = Math.max(
            0,
            state.customCategoryCount - 1,
          );
        }
      });
  },
});
export default categoriesSlice.reducer;
