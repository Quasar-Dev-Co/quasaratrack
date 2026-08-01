"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Save,
  Monitor,
  Globe,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Employee } from "@/store/slices/employeesSlice";
import { timeAgo } from "@/lib/utils";

export function EmployeeDialog({
  open,
  onOpenChange,
  employee,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (employee) {
      setName(employee.name || "");
      setRole(employee.role || "");
      setDepartment(employee.department || "");
      setEmail(employee.email || "");
      setMessage(null);
    }
  }, [employee]);

  if (!employee) return null;

  const inputStyle: React.CSSProperties = {
    background: "rgba(10, 15, 36, 0.6)",
    border: "1px solid rgba(124, 92, 255, 0.15)",
    color: "#e8eaf6",
  };

  const handleSave = async () => {
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/update-employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.id,
          name,
          role,
          department,
          email,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to save" });
      } else {
        setMessage({ type: "success", text: "Employee updated successfully!" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Employee Details</DialogTitle>
          <DialogDescription>
            View and edit employee information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Profile header */}
          <div className="flex items-center gap-4 rounded-xl p-4" style={{ background: "rgba(124, 92, 255, 0.08)" }}>
            <Avatar className="h-14 w-14">
              <AvatarFallback
                className="text-lg font-bold"
                style={{
                  background: "linear-gradient(135deg, rgba(124,92,255,0.2) 0%, rgba(217,70,239,0.15) 100%)",
                  color: "#c084fc",
                }}
              >
                {(employee.name ?? "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-base font-semibold text-foreground">
                {employee.name || "Unknown"}
              </p>
              <p className="text-xs text-muted-foreground">{employee.email || "—"}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${employee.active ? "bg-green-500 animate-pulse" : "bg-zinc-400"}`}
                />
                <Badge variant={employee.active ? "success" : "secondary"}>
                  {employee.active ? "Active" : "Away"}
                </Badge>
                <span className="text-xs text-zinc-500">
                  {timeAgo(employee.lastSeen)}
                </span>
              </div>
            </div>
          </div>

          {/* System info (read-only) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Monitor className="h-3.5 w-3.5" />
                Browser
              </div>
              <p className="mt-1 text-sm font-medium text-foreground">
                {employee.browser || "Unknown"}
                {employee.browserVersion ? ` ${employee.browserVersion}` : ""}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Globe className="h-3.5 w-3.5" />
                OS
              </div>
              <p className="mt-1 text-sm font-medium text-foreground">
                {employee.os || "Unknown"}
              </p>
            </div>
            {employee.currentTab && (
              <div className="col-span-2 rounded-lg border border-border p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Globe className="h-3.5 w-3.5" />
                  Current Tab
                </div>
                <p className="mt-1 truncate text-sm font-medium text-foreground">
                  {employee.currentTab.title || employee.currentTab.url}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {employee.currentTab.url}
                </p>
              </div>
            )}
          </div>

          {/* Editable fields */}
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "rgba(124, 92, 255, 0.5)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(124, 92, 255, 0.15)")}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "rgba(124, 92, 255, 0.5)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(124, 92, 255, 0.15)")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Role
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Developer"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(124, 92, 255, 0.5)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(124, 92, 255, 0.15)")}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Engineering"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(124, 92, 255, 0.5)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(124, 92, 255, 0.15)")}
                />
              </div>
            </div>
          </div>

          {/* Status message */}
          {message && (
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
              style={
                message.type === "success"
                  ? {
                      background: "rgba(52, 211, 153, 0.1)",
                      border: "1px solid rgba(52, 211, 153, 0.25)",
                      color: "#34d399",
                    }
                  : {
                      background: "rgba(248, 113, 113, 0.1)",
                      border: "1px solid rgba(248, 113, 113, 0.25)",
                      color: "#f87171",
                    }
              }
            >
              {message.type === "success" ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              )}
              {message.text}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #d946ef 100%)",
              boxShadow: "0 6px 18px rgba(124, 92, 255, 0.3)",
            }}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
