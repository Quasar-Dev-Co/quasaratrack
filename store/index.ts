import { configureStore } from "@reduxjs/toolkit";
import employeesReducer from "./slices/employeesSlice";
import trackingReducer from "./slices/trackingSlice";

export const store = configureStore({
  reducer: {
    employees: employeesReducer,
    tracking: trackingReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
