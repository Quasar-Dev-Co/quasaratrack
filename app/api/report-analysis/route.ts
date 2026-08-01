export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ref, get } from "firebase/database";
import { db } from "@/lib/firebase";

interface DayData {
  date: string;
  tabs: TabEntry[];
  totalActiveTime: number;
  totalInactiveTime: number;
  totalKeystrokes: number;
  totalCopies: number;
  totalPastes: number;
  totalClicks: number;
  actionLog: ActionLogEntry[];
}

interface TabEntry {
  tabId: number;
  url: string;
  domain: string;
  title: string;
  activeTime: number;
  inactiveTime: number;
  keystrokes: number;
  copies: number;
  pastes: number;
  clicks: number;
}

interface ActionLogEntry {
  time: string;
  action: string;
  element: string;
  label: string;
}

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function fetchDayRange(
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<DayData[]> {
  const days: DayData[] = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateKey = toLocalDateStr(d);
    try {
      const snap = await get(ref(db, `employees/${employeeId}/days/${dateKey}`));
      if (snap.exists()) {
        const day = snap.val() as DayData;
        if (!day.tabs) day.tabs = [];
        if (!day.actionLog) day.actionLog = [];
        if (!day.date) day.date = dateKey;
        days.push(day);
      }
    } catch (e) {
      console.error("Error fetching day", dateKey, e);
    }
  }

  return days.sort((a, b) => a.date.localeCompare(b.date));
}

function fmtHours(seconds: number): string {
  const h = seconds / 3600;
  return `${h.toFixed(2)}h`;
}



// Build the prompt for GPT-5.4-nano
function buildPrompt(
  employeeName: string,
  days: DayData[],
  language: "en" | "nl",
  startDate: string,
  endDate: string
): string {
  // Aggregate data
  const totalActive = days.reduce((s, d) => s + (d.totalActiveTime || 0), 0);
  const totalInactive = days.reduce((s, d) => s + (d.totalInactiveTime || 0), 0);
  const totalKeystrokes = days.reduce((s, d) => s + (d.totalKeystrokes || 0), 0);
  const totalCopies = days.reduce((s, d) => s + (d.totalCopies || 0), 0);
  const totalPastes = days.reduce((s, d) => s + (d.totalPastes || 0), 0);
  const totalClicks = days.reduce((s, d) => s + (d.totalClicks || 0), 0);
  const avgDaily = days.length > 0 ? totalActive / days.length : 0;

  // Aggregate tabs by domain
  const domainMap: Record<string, { domain: string; title: string; activeTime: number; keystrokes: number; clicks: number }> = {};
  days.forEach((d) => {
    (d.tabs || []).forEach((t) => {
      const key = t.domain || "unknown";
      if (!domainMap[key]) {
        domainMap[key] = {
          domain: t.domain || "Unknown",
          title: t.title || t.url || "Unknown",
          activeTime: 0,
          keystrokes: 0,
          clicks: 0,
        };
      }
      domainMap[key].activeTime += t.activeTime || 0;
      domainMap[key].keystrokes += t.keystrokes || 0;
      domainMap[key].clicks += t.clicks || 0;
    });
  });

  const topSites = Object.values(domainMap)
    .sort((a, b) => b.activeTime - a.activeTime)
    .slice(0, 10)
    .map((s) => `- ${s.domain}: ${fmtHours(s.activeTime)} active, ${s.keystrokes} keystrokes, ${s.clicks} clicks`)
    .join("\n");

  // Daily breakdown
  const dailyBreakdown = days
    .map((d) => `${d.date}: ${fmtHours(d.totalActiveTime || 0)} active, ${d.totalKeystrokes || 0} keys, ${d.totalClicks || 0} clicks`)
    .join("\n");

  // Action distribution
  const actionCounts: Record<string, number> = {};
  days.forEach((d) => {
    (d.actionLog || []).forEach((a) => {
      actionCounts[a.action] = (actionCounts[a.action] || 0) + 1;
    });
  });

  const langInstruction =
    language === "nl"
      ? "Write the entire response in Dutch (Nederlands). All text, labels, and the summary paragraph must be in Dutch."
      : "Write the entire response in English. All text, labels, and the summary paragraph must be in English.";

  return `You are a productivity analysis AI. Analyze the following employee activity data and generate a structured report.

${langInstruction}

Employee: ${employeeName}
Period: ${startDate} to ${endDate} (${days.length} day(s))

OVERALL TOTALS:
- Total Active Time: ${fmtHours(totalActive)}
- Total Inactive Time: ${fmtHours(totalInactive)}
- Average Daily Active Time: ${fmtHours(avgDaily)}
- Total Keystrokes: ${totalKeystrokes}
- Total Clicks: ${totalClicks}
- Total Copies: ${totalCopies}
- Total Pastes: ${totalPastes}

TOP WEBSITES BY ACTIVE TIME:
${topSites}

DAILY BREAKDOWN:
${dailyBreakdown}

ACTION DISTRIBUTION:
${Object.entries(actionCounts).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

You MUST respond with a JSON object (and NOTHING else) in this exact format:
{
  "totalActiveHours": "X.XX",
  "averageDailyHours": "X.XX",
  "topWebsites": [
    { "domain": "example.com", "title": "Site Title", "hours": "X.XX", "percentage": XX },
    { "domain": "example2.com", "title": "Site Title 2", "hours": "X.XX", "percentage": XX }
  ],
  "summary": "4-6 line paragraph summarizing the employee's work patterns, productivity, and notable activities",
  "rating": X,
  "ratingReason": "1-2 sentence explanation for the rating"
}

Rules:
- rating is a number from 1 to 10 (integer)
- percentage in topWebsites is the percentage of total active time spent on that site (integer)
- hours are strings with 2 decimal places
- Include 5-8 top websites
- The summary should be 4-6 lines as a single paragraph
- Respond with ONLY the JSON, no markdown, no code blocks, no extra text`;
}

interface AIAnalysis {
  totalActiveHours: string;
  averageDailyHours: string;
  topWebsites: { domain: string; title: string; hours: string; percentage: number }[];
  summary: string;
  rating: number;
  ratingReason: string;
}

async function callAI(prompt: string, apiKey: string): Promise<AIAnalysis> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-5.4-nano",
      messages: [
        {
          role: "system",
          content:
            "You are a productivity analysis assistant. You always respond with valid JSON only, no markdown or extra text.",
        },
        { role: "user", content: prompt },
      ],
      max_completion_tokens: 1500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || "";

  // Strip any markdown code fences if present
  const jsonStr = content
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  return JSON.parse(jsonStr) as AIAnalysis;
}

export async function POST(request: NextRequest) {
  try {
    const { employeeId, employeeName, startDate, endDate, language } = await request.json();

    if (!employeeId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "employeeId, startDate, endDate are required" },
        { status: 400 }
      );
    }

    const lang: "en" | "nl" = language === "nl" ? "nl" : "en";

    // Fetch all day data from Firebase
    const days = await fetchDayRange(employeeId, startDate, endDate);

    if (days.length === 0) {
      return NextResponse.json(
        { error: "No data found for the selected period" },
        { status: 404 }
      );
    }

    // Calculate raw stats for the PDF
    const totals = days.reduce(
      (acc, d) => {
        acc.activeTime += d.totalActiveTime || 0;
        acc.inactiveTime += d.totalInactiveTime || 0;
        acc.keystrokes += d.totalKeystrokes || 0;
        acc.copies += d.totalCopies || 0;
        acc.pastes += d.totalPastes || 0;
        acc.clicks += d.totalClicks || 0;
        acc.tabs += (d.tabs || []).length;
        acc.actions += (d.actionLog || []).length;
        return acc;
      },
      { activeTime: 0, inactiveTime: 0, keystrokes: 0, copies: 0, pastes: 0, clicks: 0, tabs: 0, actions: 0 }
    );

    // Aggregate tabs by domain for chart
    const domainMap: Record<string, { domain: string; title: string; activeTime: number; keystrokes: number; clicks: number; copies: number; pastes: number }> = {};
    days.forEach((d) => {
      (d.tabs || []).forEach((t) => {
        const key = t.domain || "unknown";
        if (!domainMap[key]) {
          domainMap[key] = {
            domain: t.domain || "Unknown",
            title: t.title || t.url || "Unknown",
            activeTime: 0,
            keystrokes: 0,
            clicks: 0,
            copies: 0,
            pastes: 0,
          };
        }
        domainMap[key].activeTime += t.activeTime || 0;
        domainMap[key].keystrokes += t.keystrokes || 0;
        domainMap[key].clicks += t.clicks || 0;
        domainMap[key].copies += t.copies || 0;
        domainMap[key].pastes += t.pastes || 0;
      });
    });

    const topSites = Object.values(domainMap)
      .sort((a, b) => b.activeTime - a.activeTime)
      .slice(0, 10);

    // Daily data for chart
    const dailyData = days.map((d) => ({
      date: d.date,
      activeTime: d.totalActiveTime || 0,
      inactiveTime: d.totalInactiveTime || 0,
      keystrokes: d.totalKeystrokes || 0,
      clicks: d.totalClicks || 0,
    }));

    // Call AI for analysis — read key from Firebase settings
    const settingsSnap = await get(ref(db, "settings/ai"));
    const settingsData = settingsSnap.val() || {};
    const apiKey = settingsData.aiApiKey || process.env.AI_API_KEY;
    let aiAnalysis: AIAnalysis;

    if (apiKey) {
      const prompt = buildPrompt(employeeName || "Employee", days, lang, startDate, endDate);
      aiAnalysis = await callAI(prompt, apiKey);
    } else {
      // Fallback without AI
      const totalActiveHours = (totals.activeTime / 3600).toFixed(2);
      const avgDailyHours = days.length > 0 ? (totals.activeTime / 3600 / days.length).toFixed(2) : "0.00";
      aiAnalysis = {
        totalActiveHours,
        averageDailyHours: avgDailyHours,
        topWebsites: topSites.slice(0, 5).map((s) => ({
          domain: s.domain,
          title: s.title,
          hours: (s.activeTime / 3600).toFixed(2),
          percentage: totals.activeTime > 0 ? Math.round((s.activeTime / totals.activeTime) * 100) : 0,
        })),
        summary: lang === "nl"
          ? `De werknemer was in totaal ${totalActiveHours} uur actief over ${days.length} dag(en), met een gemiddelde van ${avgDailyHours} uur per dag. Er werden ${totals.keystrokes} toetsaanslagen en ${totals.clicks} klikken geregistreerd. De meest gebruikte website was ${topSites[0]?.domain || "onbekend"}.`
          : `The employee was active for a total of ${totalActiveHours} hours over ${days.length} day(s), averaging ${avgDailyHours} hours per day. They recorded ${totals.keystrokes} keystrokes and ${totals.clicks} clicks. The most used website was ${topSites[0]?.domain || "unknown"}.`,
        rating: Math.min(10, Math.max(1, Math.round((totals.activeTime / 3600) / (days.length * 4) * 10))),
        ratingReason: lang === "nl"
          ? "Gebaseerd op totale actieve tijd en activiteitsniveau."
          : "Based on total active time and activity level.",
      };
    }

    return NextResponse.json({
      success: true,
      analysis: aiAnalysis,
      rawData: {
        totals,
        topSites,
        dailyData,
        days: days.length,
        startDate,
        endDate,
        employeeName: employeeName || "Employee",
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to generate report";
    console.error("Report analysis error:", error);
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
