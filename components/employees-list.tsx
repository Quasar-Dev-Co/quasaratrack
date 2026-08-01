"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchEmployees } from "@/store/slices/employeesSlice";

export function EmployeesList() {
  const dispatch = useAppDispatch();
  const { list, loading, error } = useAppSelector((s) => s.employees);

  useEffect(() => {
    dispatch(fetchEmployees());
  }, [dispatch]);

  if (loading) return <p className="text-sm text-zinc-500">Loading employees...</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (list.length === 0)
    return <p className="text-sm text-zinc-500">No employees tracked yet.</p>;

  return (
    <div className="space-y-2">
      {list.map((emp) => (
        <div
          key={emp.id}
          className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
        >
          <div>
            <p className="font-medium">{emp.name}</p>
            <p className="text-xs text-zinc-500">{emp.role} - {emp.department}</p>
          </div>
          <span
            className={`inline-flex h-2 w-2 rounded-full ${
              emp.active ? "bg-green-500" : "bg-zinc-400"
            }`}
          />
        </div>
      ))}
    </div>
  );
}
