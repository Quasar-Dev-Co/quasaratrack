import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { ref, onValue, off, get } from "firebase/database";
import { db } from "@/lib/firebase";

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  active: boolean;
  lastSeen: number;
  browser: string;
  browserVersion: string;
  os: string;
  currentTab: {
    url: string;
    title: string;
    favIconUrl: string;
    timestamp: number;
  } | null;
}

interface EmployeesState {
  list: Employee[];
  loading: boolean;
  error: string | null;
  listenerActive: boolean;
}

const initialState: EmployeesState = {
  list: [],
  loading: false,
  error: null,
  listenerActive: false,
};

// One-time fetch of all employees
export const fetchEmployees = createAsyncThunk(
  "employees/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const snap = await get(ref(db, "employees"));
      if (!snap.exists()) return [];
      const val = snap.val();
      return Object.keys(val).map((id) => ({
        id,
        ...val[id]?.profile,
      })) as Employee[];
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch employees";
      return rejectWithValue(message);
    }
  }
);

// Real-time listener — attaches onValue to /employees
export const startEmployeesListener = createAsyncThunk(
  "employees/startListener",
  async (_, { dispatch }) => {
    const employeesRef = ref(db, "employees");
    onValue(employeesRef, (snap) => {
      if (!snap.exists()) {
        dispatch(employeesSlice.actions.setEmployees([]));
        return;
      }
      const val = snap.val();
      const list = Object.keys(val).map((id) => ({
        id,
        ...val[id]?.profile,
      })) as Employee[];
      dispatch(employeesSlice.actions.setEmployees(list));
    });
  }
);

export const stopEmployeesListener = createAsyncThunk(
  "employees/stopListener",
  async () => {
    off(ref(db, "employees"));
  }
);

const employeesSlice = createSlice({
  name: "employees",
  initialState,
  reducers: {
    setEmployees(state, action: PayloadAction<Employee[]>) {
      state.list = action.payload;
      state.loading = false;
    },
    clearEmployees(state) {
      state.list = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.list = action.payload;
        state.loading = false;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(startEmployeesListener.pending, (state) => {
        state.listenerActive = true;
        state.loading = true;
      })
      .addCase(startEmployeesListener.fulfilled, (state) => {
        state.listenerActive = true;
      })
      .addCase(stopEmployeesListener.fulfilled, (state) => {
        state.listenerActive = false;
      });
  },
});

export const { setEmployees, clearEmployees } = employeesSlice.actions;
export default employeesSlice.reducer;
