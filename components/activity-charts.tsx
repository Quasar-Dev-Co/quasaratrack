"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { DayData, ActionLogEntry } from "@/store/slices/trackingSlice";

function fmtTime(seconds: number): string {
  if (!seconds || seconds < 1) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Line Chart: hourly activity timeline ──
export function HourlyActivityChart({ day }: { day: DayData }) {
  const hours: { hour: string; count: number; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    hours.push({
      hour: String(h).padStart(2, "0"),
      count: 0,
      label: `${h}:00`,
    });
  }

  (day.actionLog || []).forEach((a: ActionLogEntry) => {
    const h = parseInt((a.time || "00").substring(0, 2), 10);
    if (h >= 0 && h < 24) hours[h].count++;
  });

  const maxCount = Math.max(...hours.map((h) => h.count), 1);

  const W = 600;
  const H = 180;
  const padL = 40;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const xFor = (i: number) => padL + (i / 23) * innerW;
  const yFor = (count: number) => padT + innerH - (count / maxCount) * innerH;

  const linePoints = hours.map((h, i) => `${xFor(i)},${yFor(h.count)}`).join(" ");
  const areaPath = `M ${xFor(0)},${padT + innerH} L ${hours
    .map((h, i) => `${xFor(i)},${yFor(h.count)}`)
    .join(" L ")} L ${xFor(23)},${padT + innerH} Z`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hourly Activity Timeline</CardTitle>
        <CardDescription>Actions per hour throughout the day</CardDescription>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "200px" }}>
          <defs>
            <linearGradient id="lineArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(124, 92, 255, 0.35)" />
              <stop offset="100%" stopColor="rgba(124, 92, 255, 0)" />
            </linearGradient>
            <linearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#d946ef" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = padT + innerH - t * innerH;
            const val = Math.round(maxCount * t);
            return (
              <g key={t}>
                <line
                  x1={padL}
                  y1={y}
                  x2={W - padR}
                  y2={y}
                  stroke="rgba(124, 92, 255, 0.08)"
                  strokeWidth="1"
                />
                <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#71717a">
                  {val}
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill="url(#lineArea)" />
          <polyline
            points={linePoints}
            fill="none"
            stroke="url(#lineStroke)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {hours.map((h, i) => {
            if (h.count === 0) return null;
            return (
              <circle
                key={i}
                cx={xFor(i)}
                cy={yFor(h.count)}
                r="3"
                fill="#a855f7"
                stroke="#1e1b4b"
                strokeWidth="1"
              />
            );
          })}

          {[0, 6, 12, 18, 23].map((h) => (
            <text
              key={h}
              x={xFor(h)}
              y={H - 8}
              textAnchor="middle"
              fontSize="10"
              fill="#71717a"
            >
              {String(h).padStart(2, "0")}:00
            </text>
          ))}
        </svg>
      </CardContent>
    </Card>
  );
}

// ── Bar Chart: per-tab activity ──
export function TabActivityChart({ day }: { day: DayData }) {
  const tabs = (day.tabs || [])
    .filter((t) => (t.activeTime || 0) > 0)
    .sort((a, b) => (b.activeTime || 0) - (a.activeTime || 0))
    .slice(0, 8);

  if (tabs.length === 0) return null;

  const maxTime = Math.max(...tabs.map((t) => t.activeTime || 0), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Tabs by Active Time</CardTitle>
        <CardDescription>Time spent on each tab</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3" style={{ minWidth: 0, width: "100%" }}>
          {tabs.map((tab, i) => {
            const widthPct = ((tab.activeTime || 0) / maxTime) * 100;
            const colors = [
              "#7c3aed", "#a855f7", "#d946ef", "#3b82f6",
              "#10b981", "#f59e0b", "#ef4444", "#06b6d4",
            ];
            const color = colors[i % colors.length];
            const title = tab.title || tab.domain || "Unknown";
            return (
              <div key={i} className="space-y-1.5" style={{ minWidth: 0, width: "100%" }}>
                <div className="flex items-center justify-between gap-2" style={{ minWidth: 0, width: "100%" }}>
                  <span
                    className="text-xs text-zinc-300"
                    style={{
                      flex: "1 1 0%",
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "block",
                    }}
                    title={title}
                  >
                    {title}
                  </span>
                  <span className="text-xs font-medium text-zinc-400" style={{ width: "50px", flexShrink: 0, textAlign: "right" }}>
                    {fmtTime(tab.activeTime || 0)}
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
      </CardContent>
    </Card>
  );
}

// ── Donut Chart: action distribution ──
export function ActionDistributionChart({ day }: { day: DayData }) {
  const actionCounts: Record<string, number> = {};
  (day.actionLog || []).forEach((a: ActionLogEntry) => {
    const action = a.action || "UNKNOWN";
    actionCounts[action] = (actionCounts[action] || 0) + 1;
  });

  const entries = Object.entries(actionCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const total = entries.reduce((sum, [, c]) => sum + c, 0);

  if (total === 0) return null;

  const colors = [
    "#7c3aed", "#3b82f6", "#10b981", "#f59e0b",
    "#ec4899", "#0ea5e9", "#a855f7", "#14b8a6",
  ];

  let cumulative = 0;
  const segments = entries.map(([action, count], i) => {
    const pct = (count / total) * 100;
    const startPct = cumulative;
    cumulative += pct;
    return { action, count, pct, color: colors[i % colors.length], startPct, endPct: cumulative };
  });

  const radius = 45;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const viewBoxSize = 110;
  const center = viewBoxSize / 2;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Action Distribution</CardTitle>
        <CardDescription>Breakdown of all {total} actions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-5">
          {/* Donut — fixed-size 110x110 */}
          <svg
            width={110}
            height={110}
            viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
            style={{ flexShrink: 0 }}
          >
            <g transform={`translate(${center}, ${center}) rotate(-90)`}>
              <circle
                r={radius}
                fill="none"
                stroke="rgba(124, 92, 255, 0.1)"
                strokeWidth={strokeWidth}
              />
              {segments.map((seg, i) => {
                const dashLen = (seg.pct / 100) * circumference;
                const dashOffset = -(seg.startPct / 100) * circumference;
                return (
                  <circle
                    key={i}
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                    strokeDashoffset={dashOffset}
                    style={{ filter: `drop-shadow(0 0 3px ${seg.color}40)` }}
                  />
                );
              })}
            </g>
            <text x={center} y={center - 3} textAnchor="middle" fontSize="16" fontWeight="bold" fill="#e8eaf6">
              {total}
            </text>
            <text x={center} y={center + 10} textAnchor="middle" fontSize="8" fill="#a4adcf">
              actions
            </text>
          </svg>

          {/* Legend */}
          <div className="grid w-full grid-cols-2 gap-2" style={{ minWidth: 0 }}>
            {segments.map((seg, i) => (
              <div key={i} className="flex items-center gap-2" style={{ minWidth: 0 }}>
                <div
                  className="h-3 w-3 flex-shrink-0 rounded"
                  style={{ background: seg.color, boxShadow: `0 0 6px ${seg.color}40` }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-zinc-200" title={seg.action}>
                    {seg.action}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {seg.count} ({Math.round(seg.pct)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Stat comparison bars: keystrokes vs clicks vs copies vs pastes ──
export function StatComparisonChart({ day }: { day: DayData }) {
  const data = [
    { label: "Keystrokes", value: day.totalKeystrokes || 0, color: "#7c3aed" },
    { label: "Clicks", value: day.totalClicks || 0, color: "#f59e0b" },
    { label: "Copies", value: day.totalCopies || 0, color: "#3b82f6" },
    { label: "Pastes", value: day.totalPastes || 0, color: "#10b981" },
  ];

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const W = 600;
  const H = 180;
  const padT = 24;
  const padB = 36;
  const innerH = H - padT - padB;
  const barW = 70;
  const gap = (W - barW * 4) / 5;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Comparison</CardTitle>
        <CardDescription>Keystrokes, clicks, copies, and pastes side by side</CardDescription>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "200px" }}>
          <defs>
            {data.map((d, i) => (
              <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={d.color} />
                <stop offset="100%" stopColor={`${d.color}40`} />
              </linearGradient>
            ))}
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = padT + innerH - t * innerH;
            return (
              <line
                key={t}
                x1="0"
                y1={y}
                x2={W}
                y2={y}
                stroke="rgba(124, 92, 255, 0.06)"
                strokeWidth="1"
              />
            );
          })}

          {data.map((d, i) => {
            const x = gap + i * (barW + gap);
            const barH = Math.max((d.value / maxValue) * innerH, 2);
            const y = padT + innerH - barH;
            return (
              <g key={d.label}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx="6"
                  fill={`url(#barGrad${i})`}
                  style={{ filter: `drop-shadow(0 0 8px ${d.color}40)` }}
                />
                <text
                  x={x + barW / 2}
                  y={y - 8}
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="bold"
                  fill={d.color}
                >
                  {d.value}
                </text>
                <text
                  x={x + barW / 2}
                  y={H - 12}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#71717a"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}
