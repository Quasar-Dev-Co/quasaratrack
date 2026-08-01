import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { ref, onValue, off } from "firebase/database";
import { db } from "@/lib/firebase";

// ── Data shapes written by the Chrome extension ──
// Path: employees/{empId}/days/{dateKey}
// The extension writes ALL tracking data to this single path.

export interface TabEntry {
  tabId: number;
  url: string;
  domain: string;
  title: string;
  openedAt: string | null;
  closedAt: string | null;
  activeTime: number;   // seconds
  inactiveTime: number; // seconds
  keystrokes: number;
  copies: number;
  pastes: number;
  clicks: number;
  inactivePeriods: { start: string; end: string; duration: string }[];
  actionLog: ActionLogEntry[];
}

export interface ActionLogEntry {
  time: string;      // "HH:MM:SS"
  action: string;    // COPY, PASTE, CUT, LINK_CLICK, ENTER_KEY, NAVIGATE, etc.
  element: string;
  label: string;
  source?: string;    // "keyboard" | "event"
  href?: string;
  from?: string;
  to?: string;
  action_?: string;
}

export interface DayData {
  date: string;
  employee: string;
  tabs: TabEntry[];
  totalActiveTime: number;     // seconds
  totalInactiveTime: number;   // seconds
  totalKeystrokes: number;
  totalCopies: number;
  totalPastes: number;
  totalClicks: number;
  aiSummary: string | null;
  synced: boolean;
  actionLog: ActionLogEntry[];
}

interface TrackingState {
  // key = `${employeeId}_${date}` → DayData
  days: Record<string, DayData>;
  loading: boolean;
  error: string | null;
  activeListeners: string[];
}

const initialState: TrackingState = {
  days: {},
  loading: false,
  error: null,
  activeListeners: [],
};

function listenerKey(employeeId: string, date: string) {
  return `${employeeId}_${date}`;
}

// Real-time listener for employees/{empId}/days/{date}
export const startDailyListener = createAsyncThunk(
  "tracking/startDailyListener",
  async (
    { employeeId, date }: { employeeId: string; date: string },
    { dispatch }
  ) => {
    const key = listenerKey(employeeId, date);
    const dayRef = ref(db, `employees/${employeeId}/days/${date}`);

    onValue(dayRef, (snap) => {
      if (!snap.exists()) {
        dispatch(trackingSlice.actions.setDay({ key, day: null }));
        return;
      }
      const day = snap.val() as DayData;
      // Firebase strips empty arrays — restore them
      if (!day.tabs) day.tabs = [];
      if (!day.actionLog) day.actionLog = [];
      dispatch(trackingSlice.actions.setDay({ key, day }));
    });

    return key;
  }
);

export const stopDailyListener = createAsyncThunk(
  "tracking/stopDailyListener",
  async ({ employeeId, date }: { employeeId: string; date: string }) => {
    const key = listenerKey(employeeId, date);
    off(ref(db, `employees/${employeeId}/days/${date}`));
    return key;
  }
);

const trackingSlice = createSlice({
  name: "tracking",
  initialState,
  reducers: {
    setDay(
      state,
      action: PayloadAction<{ key: string; day: DayData | null }>
    ) {
      state.days[action.payload.key] = action.payload.day ?? {
        date: "",
        employee: "",
        tabs: [],
        totalActiveTime: 0,
        totalInactiveTime: 0,
        totalKeystrokes: 0,
        totalCopies: 0,
        totalPastes: 0,
        totalClicks: 0,
        aiSummary: null,
        synced: false,
        actionLog: [],
      };
      state.loading = false;
    },
    clearTracking(state) {
      state.days = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(startDailyListener.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startDailyListener.fulfilled, (state, action) => {
        state.loading = false;
        if (!state.activeListeners.includes(action.payload)) {
          state.activeListeners.push(action.payload);
        }
      })
      .addCase(startDailyListener.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to start listener";
      })
      .addCase(stopDailyListener.fulfilled, (state, action) => {
        state.activeListeners = state.activeListeners.filter(
          (k) => k !== action.payload
        );
      });
  },
});

export const { setDay, clearTracking } = trackingSlice.actions;
export default trackingSlice.reducer;
