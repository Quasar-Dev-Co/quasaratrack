"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Users,
  Activity as ActivityIcon,
  Clock,
  TrendingUp,
  Globe,
  Monitor,
  Zap,
  Keyboard,
  MousePointerClick,
  Copy,
  Clipboard,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { timeAgo } from "@/lib/utils";
import {
  startEmployeesListener,
  stopEmployeesListener,
  type Employee,
} from "@/store/slices/employeesSlice";
import { ref, get } from "firebase/database";
import { db } from "@/lib/firebase";

interface DayData {
  date: string;
  totalActiveTime: number;
  totalKeystrokes: number;
  totalCopies: number;
  totalPastes: number;
  totalClicks: number;
  tabs: { domain: string; title: string; activeTime: number }[];
  actionLog: { time: string; action: string; element: string; label: string }[];
}

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fmtTime(seconds: number): string {
  if (!seconds || seconds < 1) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function Home() {
  const dispatch = useAppDispatch();
  const { list: employees, loading } = useAppSelector((s) => s.employees);

  const [now, setNow] = useState(() => Date.now());
  const [todayData, setTodayData] = useState<Record<string, DayData>>({});

  useEffect(() => {
    dispatch(startEmployeesListener());
    return () => {
      dispatch(stopEmployeesListener());
    };
  }, [dispatch]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch today's activity data for all employees
  useEffect(() => {
    if (employees.length === 0) return;
    const today = toLocalDateStr(new Date());
    employees.forEach(async (emp) => {
      try {
        const snap = await get(ref(db, `employees/${emp.id}/days/${today}`));
        if (snap.exists()) {
          const data = snap.val() as DayData;
          if (!data.tabs) data.tabs = [];
          if (!data.actionLog) data.actionLog = [];
          setTodayData((prev) => ({ ...prev, [emp.id]: data }));
        }
      } catch {
        // ignore
      }
    });
  }, [employees]);

  const STALE_MS = 60 * 1000;
  const isActuallyActive = (e: Employee) =>
    e.active && e.lastSeen && now - e.lastSeen < STALE_MS;

  const activeCount = employees.filter(isActuallyActive).length;
  const totalCount = employees.length;
  const inactiveCount = totalCount - activeCount;
  const engagement =
    totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

  // Aggregate today's stats across all employees
  const todayTotals = Object.values(todayData).reduce(
    (acc, d) => {
      acc.activeTime += d.totalActiveTime || 0;
      acc.keystrokes += d.totalKeystrokes || 0;
      acc.clicks += d.totalClicks || 0;
      acc.copies += d.totalCopies || 0;
      acc.pastes += d.totalPastes || 0;
      acc.tabs += (d.tabs || []).length;
      acc.actions += (d.actionLog || []).length;
      return acc;
    },
    { activeTime: 0, keystrokes: 0, clicks: 0, copies: 0, pastes: 0, tabs: 0, actions: 0 }
  );

  // Recent activity feed — combine all employees' action logs
  const recentActivity = employees
    .map((emp) => {
      const day = todayData[emp.id];
      if (!day || !day.actionLog) return [];
      return day.actionLog.slice(-5).map((a) => ({
        ...a,
        employeeName: emp.name || "Unknown",
        employeeId: emp.id,
      }));
    })
    .flat()
    .sort((a, b) => (b.time || "").localeCompare(a.time || ""))
    .slice(0, 12);

  // Top active employees today
  const topEmployees = employees
    .map((emp) => ({
      ...emp,
      activeTime: todayData[emp.id]?.totalActiveTime || 0,
      keystrokes: todayData[emp.id]?.totalKeystrokes || 0,
    }))
    .sort((a, b) => b.activeTime - a.activeTime)
    .slice(0, 5);

  // Top websites across all employees today
  const domainMap: Record<string, { domain: string; activeTime: number }> = {};
  Object.values(todayData).forEach((d) => {
    (d.tabs || []).forEach((t) => {
      const key = t.domain || "unknown";
      if (!domainMap[key]) domainMap[key] = { domain: t.domain || "Unknown", activeTime: 0 };
      domainMap[key].activeTime += t.activeTime || 0;
    });
  });
  const topSites = Object.values(domainMap)
    .sort((a, b) => b.activeTime - a.activeTime)
    .slice(0, 6);

  const stats = [
    {
      label: "Total Employees",
      value: totalCount,
      icon: Users,
      gradient: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
      glow: "rgba(124, 92, 255, 0.25)",
    },
    {
      label: "Active Now",
      value: activeCount,
      icon: ActivityIcon,
      gradient: "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
      glow: "rgba(52, 211, 153, 0.25)",
    },
    {
      label: "Inactive",
      value: inactiveCount,
      icon: Clock,
      gradient: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
      glow: "rgba(251, 191, 36, 0.25)",
    },
    {
      label: "Engagement",
      value: `${engagement}%`,
      icon: TrendingUp,
      gradient: "linear-gradient(135deg, #d946ef 0%, #c084fc 100%)",
      glow: "rgba(217, 70, 239, 0.25)",
    },
  ];

  const actionColors: Record<string, string> = {
    COPY: "#3b82f6",
    PASTE: "#10b981",
    CUT: "#f59e0b",
    LINK_CLICK: "#a855f7",
    BUTTON_CLICK: "#a855f7",
    ENTER_KEY: "#06b6d4",
    NAVIGATE: "#f59e0b",
    TAB_CLICK: "#6366f1",
    UI_CLICK: "#6366f1",
    DROPDOWN_CHANGE: "#ec4899",
    FORM_SUBMIT: "#ef4444",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up">
        <div className="mb-3 flex items-center gap-2">
          <Image
            src="/icon-32.png"
            alt="Quasara Track"
            width={24}
            height={24}
            className="rounded-md"
          />
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "#c084fc" }}
          >
            Dashboard
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time productivity monitoring across your team
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 sm:gap-5">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="animate-fade-in-up relative overflow-hidden rounded-2xl"
              style={{
                animationDelay: `${(i + 1) * 100}ms`,
                background: "rgba(22, 28, 64, 0.55)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(124, 92, 255, 0.18)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
              }}
            >
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl"
                style={{ background: stat.gradient }}
              />
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{
                      background: stat.gradient,
                      boxShadow: `0 6px 18px ${stat.glow}, inset 0 1px 0 rgba(255,255,255,0.25)`,
                    }}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <p className="mt-4 text-3xl font-bold tracking-tight text-foreground">
                  {stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's activity stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {[
          { label: "Active Time Today", value: fmtTime(todayTotals.activeTime), icon: Clock, color: "#34d399" },
          { label: "Keystrokes Today", value: todayTotals.keystrokes, icon: Keyboard, color: "#7c3aed" },
          { label: "Clicks Today", value: todayTotals.clicks, icon: MousePointerClick, color: "#f59e0b" },
          { label: "Copies/Pastes", value: `${todayTotals.copies}/${todayTotals.pastes}`, icon: Copy, color: "#3b82f6" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
                <Icon className="h-4 w-4" style={{ color: s.color }} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" style={{ color: s.color }}>
                  {s.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts row: Engagement donut + Top websites bar chart */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Engagement donut chart */}
        <Card>
          <CardHeader>
            <CardTitle>Team Engagement</CardTitle>
            <CardDescription>Active vs Inactive employees</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
              {/* Donut */}
              <div className="relative flex-shrink-0">
                <svg width="120" height="120" className="sm:w-[140px] sm:h-[140px]" viewBox="0 0 140 140">
                  <g transform="translate(70, 70) rotate(-90)">
                    <circle r="50" fill="none" stroke="rgba(124,92,255,0.06)" strokeWidth="18" />
                    {activeCount > 0 && (
                      <circle
                        r="50"
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="18"
                        strokeDasharray={`${(activeCount / totalCount) * 314} 314`}
                        style={{ filter: "drop-shadow(0 0 4px rgba(52,211,153,0.4))" }}
                      />
                    )}
                    {inactiveCount > 0 && (
                      <circle
                        r="50"
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="18"
                        strokeDasharray={`${(inactiveCount / totalCount) * 314} 314`}
                        strokeDashoffset={`-${(activeCount / totalCount) * 314}`}
                        style={{ filter: "drop-shadow(0 0 4px rgba(251,191,36,0.4))" }}
                      />
                    )}
                  </g>
                  <text x="70" y="64" textAnchor="middle" className="fill-foreground" style={{ fontSize: "22px", fontWeight: "bold" }}>
                    {engagement}%
                  </text>
                  <text x="70" y="82" textAnchor="middle" className="fill-zinc-500" style={{ fontSize: "9px" }}>
                    engaged
                  </text>
                </svg>
              </div>
              {/* Legend */}
              <div className="grid grid-cols-3 gap-3 sm:block sm:space-y-3">
                <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
                  <div className="h-3 w-3 rounded" style={{ background: "#34d399", boxShadow: "0 0 6px rgba(52,211,153,0.4)" }} />
                  <span className="text-sm font-medium text-foreground">Active</span>
                  <span className="text-sm text-zinc-500">{activeCount}</span>
                </div>
                <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
                  <div className="h-3 w-3 rounded" style={{ background: "#fbbf24", boxShadow: "0 0 6px rgba(251,191,36,0.4)" }} />
                  <span className="text-sm font-medium text-foreground">Inactive</span>
                  <span className="text-sm text-zinc-500">{inactiveCount}</span>
                </div>
                <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
                  <div className="h-3 w-3 rounded bg-zinc-600" />
                  <span className="text-sm font-medium text-foreground">Total</span>
                  <span className="text-sm text-zinc-500">{totalCount}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top websites horizontal bar chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Websites Today</CardTitle>
            <CardDescription>Most active sites across the team</CardDescription>
          </CardHeader>
          <CardContent>
            {topSites.length === 0 ? (
              <p className="text-sm text-zinc-500">No website data yet today.</p>
            ) : (
              <div className="space-y-3">
                {topSites.map((site, i) => {
                  const maxTime = topSites[0]?.activeTime || 1;
                  const widthPct = (site.activeTime / maxTime) * 100;
                  const colors = ["#7c3aed", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];
                  const color = colors[i % colors.length];
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate pr-2 text-zinc-300">{site.domain}</span>
                        <span className="flex-shrink-0 font-medium text-zinc-400">
                          {fmtTime(site.activeTime)}
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800/50">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${widthPct}%`,
                            background: `linear-gradient(90deg, ${color}aa, ${color})`,
                            boxShadow: `0 0 8px ${color}40`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top active employees + Recent activity feed */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top active employees */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#a855f7]" />
              Top Active Employees Today
            </CardTitle>
            <CardDescription>Ranked by total active time</CardDescription>
          </CardHeader>
          <CardContent>
            {topEmployees.length === 0 ? (
              <p className="text-sm text-zinc-500">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {topEmployees.map((emp, i) => {
                  const maxTime = topEmployees[0]?.activeTime || 1;
                  const widthPct = (emp.activeTime / maxTime) * 100;
                  const colors = ["#7c3aed", "#a855f7", "#d946ef", "#3b82f6", "#10b981"];
                  const color = colors[i % colors.length];
                  return (
                    <div key={emp.id} className="flex flex-col gap-2 rounded-lg p-2 sm:flex-row sm:items-center sm:gap-3" style={{ background: "rgba(22,28,64,0.3)", borderRadius: "8px" }}>
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-sm font-bold text-zinc-500">#{i + 1}</span>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback
                            className="text-xs font-bold"
                            style={{ background: "rgba(124,92,255,0.15)", color: "#c084fc" }}
                          >
                            {emp.name?.charAt(0)?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm font-medium text-foreground sm:hidden">
                          {emp.name || "Unknown"}
                        </span>
                        <span className="ml-auto flex-shrink-0 text-xs font-medium text-zinc-400 sm:hidden">
                          {fmtTime(emp.activeTime)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="hidden items-center justify-between sm:flex">
                          <span className="truncate text-sm font-medium text-foreground">
                            {emp.name || "Unknown"}
                          </span>
                          <span className="ml-2 flex-shrink-0 text-xs font-medium text-zinc-400">
                            {fmtTime(emp.activeTime)}
                          </span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-800/50">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${widthPct}%`,
                              background: `linear-gradient(90deg, ${color}aa, ${color})`,
                              boxShadow: `0 0 6px ${color}40`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent activity feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#fbbf24]" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest actions across all employees</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-zinc-500">No recent activity.</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {recentActivity.map((a, i) => {
                  const color = actionColors[a.action] || "#71717a";
                  return (
                    <div
                      key={i}
                      className="flex flex-col gap-1.5 rounded-lg border border-zinc-800/50 p-2.5 sm:flex-row sm:items-center sm:gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-2 w-2 flex-shrink-0 rounded-full"
                          style={{ background: color, boxShadow: `0 0 6px ${color}40` }}
                        />
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="truncate text-xs font-medium text-foreground">
                            {a.employeeName}
                          </span>
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                            style={{ background: `${color}20`, color }}
                          >
                            {a.action}
                          </span>
                        </div>
                        <span className="flex-shrink-0 text-xs text-zinc-500 sm:hidden">
                          {a.time}
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 items-center justify-between sm:gap-3">
                        <p className="truncate text-xs text-zinc-500">
                          {a.label || a.element}
                        </p>
                        <span className="hidden flex-shrink-0 text-xs text-zinc-500 sm:inline">
                          {a.time}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Employee status list */}
      <div
        className="animate-fade-in-up overflow-hidden rounded-2xl"
        style={{
          animationDelay: "500ms",
          background: "rgba(22, 28, 64, 0.55)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(124, 92, 255, 0.18)",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div className="flex items-center justify-between border-b border-[rgba(124,92,255,0.12)] p-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Employee Status
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {loading
                ? "Loading..."
                : `${totalCount} employees · ${activeCount} active right now`}
            </p>
          </div>
          {totalCount > 0 && (
            <div
              className="flex items-center gap-2 rounded-full px-3 py-1.5"
              style={{
                background: "rgba(52, 211, 153, 0.1)",
                border: "1px solid rgba(52, 211, 153, 0.2)",
              }}
            >
              <div
                className="h-2 w-2 animate-pulse rounded-full"
                style={{ background: "#34d399", boxShadow: "0 0 8px #34d399" }}
              />
              <span className="text-xs font-medium" style={{ color: "#34d399" }}>
                Live
              </span>
            </div>
          )}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="shimmer h-16 rounded-xl" />
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{
                  background: "rgba(124, 92, 255, 0.1)",
                  border: "1px solid rgba(124, 92, 255, 0.15)",
                }}
              >
                <Users className="h-8 w-8" style={{ color: "#a4adcf" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  No employees tracked yet
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Install the Quasara Track extension to start monitoring
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {employees.map((emp: Employee, i: number) => (
                <div
                  key={emp.id}
                  className="emp-row animate-fade-in-up flex flex-col gap-3 rounded-xl p-4 transition-all duration-200 sm:flex-row sm:items-center sm:justify-between"
                  style={{
                    animationDelay: `${i * 50}ms`,
                    background: "rgba(22, 28, 64, 0.4)",
                    border: "1px solid rgba(124, 92, 255, 0.12)",
                  }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-10 w-10" style={{ border: "1px solid rgba(124, 92, 255, 0.18)" }}>
                      <AvatarFallback
                        className="text-sm font-bold"
                        style={{
                          background: "linear-gradient(135deg, rgba(124,92,255,0.2) 0%, rgba(217,70,239,0.15) 100%)",
                          color: "#c084fc",
                        }}
                      >
                        {emp.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {emp.name || "Unknown"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {emp.role || "—"} · {emp.department || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:justify-start sm:gap-3">
                    {emp.browser && (
                      <Badge variant="outline" className="hidden items-center gap-1.5 md:flex">
                        <Monitor className="h-3 w-3" />
                        {emp.browser}
                      </Badge>
                    )}
                    {emp.currentTab && (
                      <div className="hidden max-w-[200px] items-center gap-1.5 xl:flex">
                        <Globe className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate text-xs text-muted-foreground">
                          {emp.currentTab.title || emp.currentTab.url}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={
                          isActuallyActive(emp)
                            ? { background: "#34d399", boxShadow: "0 0 8px #34d399" }
                            : { background: "rgba(107, 114, 153, 0.4)" }
                        }
                      />
                      <Badge variant={isActuallyActive(emp) ? "success" : "secondary"}>
                        {isActuallyActive(emp) ? "Active" : "Away"}
                      </Badge>
                      {emp.lastSeen && (
                        <span className="hidden text-xs text-zinc-500 sm:inline">
                          {timeAgo(emp.lastSeen)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
