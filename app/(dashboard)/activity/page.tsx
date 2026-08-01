"use client";

import { useEffect, useState } from "react";
import {
  Keyboard,
  Copy,
  Clipboard,
  MousePointerClick,
  Clock,
  Globe,
  Calendar as CalendarIcon,
  ChevronDown,
  Download,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ReportDialog } from "@/components/report-dialog";
import {
  HourlyActivityChart,
  TabActivityChart,
  ActionDistributionChart,
  StatComparisonChart,
} from "@/components/activity-charts";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { timeAgo } from "@/lib/utils";
import { startEmployeesListener, stopEmployeesListener, type Employee } from "@/store/slices/employeesSlice";
import { startDailyListener, stopDailyListener, type DayData, type ActionLogEntry } from "@/store/slices/trackingSlice";

function fmtTime(seconds: number) {
  if (!seconds || seconds < 1) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Format a Date to YYYY-MM-DD using LOCAL time (not UTC)
// toISOString() converts to UTC which shifts the date in non-UTC timezones
function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const actionColors: Record<string, string> = {
  COPY: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  PASTE: "bg-green-500/15 text-green-400 border-green-500/20",
  CUT: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  LINK_CLICK: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  BUTTON_CLICK: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  ENTER_KEY: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  NAVIGATE: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  TAB_CLICK: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  UI_CLICK: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  DROPDOWN_CHANGE: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  FORM_SUBMIT: "bg-red-500/15 text-red-400 border-red-500/20",
};

export default function ActivityLogPage() {
  const dispatch = useAppDispatch();
  const { list: employees } = useAppSelector((s) => s.employees);
  const { days, loading } = useAppSelector((s) => s.tracking);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    toLocalDateStr(new Date())
  );
  const [now, setNow] = useState(() => Date.now());
  const [reportOpen, setReportOpen] = useState(false);

  // Ticking clock to re-evaluate presence (browser close detection)
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  const STALE_MS = 60 * 1000;
  const selectedEmp: Employee | undefined = employees.find((e) => e.id === selectedEmployee);
  const isOnline = !!(
    selectedEmp &&
    selectedEmp.active &&
    selectedEmp.lastSeen &&
    now - selectedEmp.lastSeen < STALE_MS
  );

  useEffect(() => {
    dispatch(startEmployeesListener());
    return () => {
      dispatch(stopEmployeesListener());
    };
  }, [dispatch]);

  useEffect(() => {
    if (selectedEmployee) {
      dispatch(startDailyListener({ employeeId: selectedEmployee, date: selectedDate }));
      return () => {
        dispatch(stopDailyListener({ employeeId: selectedEmployee, date: selectedDate }));
      };
    }
  }, [dispatch, selectedEmployee, selectedDate]);

  const activityKey = `${selectedEmployee}_${selectedDate}`;
  const day: DayData | undefined = days[activityKey];
  const actionLog: ActionLogEntry[] = day?.actionLog ?? [];
  const reversedLog = [...actionLog].reverse();

  const stats = [
    { label: "Keystrokes", value: day?.totalKeystrokes ?? 0, icon: Keyboard, color: "#7c3aed" },
    { label: "Copies", value: day?.totalCopies ?? 0, icon: Copy, color: "#3b82f6" },
    { label: "Pastes", value: day?.totalPastes ?? 0, icon: Clipboard, color: "#10b981" },
    { label: "Clicks", value: day?.totalClicks ?? 0, icon: MousePointerClick, color: "#f59e0b" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Activity Log</h1>
        <p className="text-sm text-zinc-500">
          All typing, copy, paste, and interaction events — real-time updates
        </p>
      </div>

      {/* Employee selector + date picker + live indicator */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950 sm:w-auto"
          >
            <option value="">Select employee...</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>

          <Popover>
            <PopoverTrigger
              render={
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate
                    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Pick a date"}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              }
            />
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate ? new Date(selectedDate + "T00:00:00") : undefined}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(toLocalDateStr(date));
                  }
                }}
                disabled={{ after: new Date() }}
              />
            </PopoverContent>
          </Popover>

          {selectedEmployee && (
            <div className="flex items-center gap-2 px-1">
              <div
                className="h-2 w-2 rounded-full"
                style={
                  isOnline
                    ? { background: "#34d399", boxShadow: "0 0 8px #34d399", animation: "pulse 2s infinite" }
                    : { background: "rgba(107, 114, 153, 0.4)" }
                }
              />
              <span className="text-xs text-zinc-500">
                {isOnline ? "Live" : "Offline"}
              </span>
              {selectedEmp?.lastSeen && (
                <span className="text-xs text-zinc-500">
                  ({timeAgo(selectedEmp.lastSeen)})
                </span>
              )}
            </div>
          )}
        </div>

        {selectedEmployee && (
          <Button
            variant="default"
            size="lg"
            onClick={() => setReportOpen(true)}
            className="w-full sm:ml-auto sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        )}
      </div>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        employeeId={selectedEmployee}
        employeeName={selectedEmp?.name || "Unknown"}
      />

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <Icon className="h-4 w-4" style={{ color: stat.color }} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Time summary */}
      {day && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-green-500" />
                Active Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {fmtTime(day.totalActiveTime)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-zinc-500" />
                Inactive Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-400">
                {fmtTime(day.totalInactiveTime)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Globe className="h-4 w-4 text-purple-500" />
                Tabs Opened
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{day.tabs.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {day && day.actionLog && day.actionLog.length > 0 && (
        <>
          {/* Line chart + stat comparison side by side */}
          <div className="grid gap-4 lg:grid-cols-2">
            <HourlyActivityChart day={day} />
            <StatComparisonChart day={day} />
          </div>

          {/* Bar chart + donut chart side by side */}
          <div className="grid gap-4 lg:grid-cols-2">
            <TabActivityChart day={day} />
            <ActionDistributionChart day={day} />
          </div>
        </>
      )}

      {/* Tab sessions */}
      {day && day.tabs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tab Sessions</CardTitle>
            <CardDescription>
              {day.tabs.length} tabs tracked on {selectedDate}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {day.tabs.map((tab, i) => (
                <div
                  key={`${tab.tabId}-${i}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {tab.title || tab.url || "Unknown"}
                      </span>
                      {tab.closedAt ? (
                        <Badge variant="secondary">Closed</Badge>
                      ) : (
                        <Badge variant="default">Open</Badge>
                      )}
                    </div>
                    <div className="mt-1 truncate text-xs text-zinc-500">
                      {tab.domain || tab.url}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 gap-2 text-xs text-zinc-500 sm:gap-4">
                    <span>Active: {fmtTime(tab.activeTime)}</span>
                    <span className="hidden sm:inline">Keys: {tab.keystrokes}</span>
                    <span className="hidden sm:inline">Clicks: {tab.clicks}</span>
                    <span className="hidden md:inline">C/P: {tab.copies}/{tab.pastes}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Raw activity feed */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Activity Feed</CardTitle>
          <CardDescription>
            {selectedEmployee
              ? `${actionLog.length} events for ${selectedDate}`
              : "Select an employee to view events"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedEmployee ? (
            <p className="text-sm text-zinc-500">Please select an employee.</p>
          ) : loading && actionLog.length === 0 ? (
            <p className="text-sm text-zinc-500">Loading...</p>
          ) : actionLog.length === 0 ? (
            <p className="text-sm text-zinc-500">No activity logged for {selectedDate}.</p>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead className="hidden sm:table-cell">Element</TableHead>
                  <TableHead className="hidden md:table-cell">Label</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reversedLog.slice(0, 100).map((a, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <span
                        className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${
                          actionColors[a.action] ??
                          "bg-zinc-500/15 text-zinc-400 border-zinc-500/20"
                        }`}
                      >
                        {a.action}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-xs text-zinc-500 sm:table-cell">
                      {a.element}
                    </TableCell>
                    <TableCell className="hidden max-w-[300px] truncate text-xs text-zinc-500 md:table-cell">
                      {a.label}
                      {a.href ? ` → ${a.href}` : ""}
                      {a.from ? ` from ${a.from}` : ""}
                      {a.to ? ` to ${a.to}` : ""}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400">
                      {a.time}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
