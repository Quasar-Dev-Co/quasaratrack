export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ref, get } from "firebase/database";
import { db } from "@/lib/firebase";

export async function POST(request: NextRequest) {
  try {
    const { employeeId, date, sheetId } = await request.json();

    if (!employeeId || !date) {
      return NextResponse.json(
        { error: "employeeId and date are required" },
        { status: 400 }
      );
    }

    const targetSheetId = sheetId || process.env.GOOGLE_SHEET_ID;
    if (!targetSheetId) {
      return NextResponse.json(
        { error: "Google Sheet ID not configured. Set GOOGLE_SHEET_ID in env or pass sheetId in request." },
        { status: 400 }
      );
    }

    // Fetch data from Firebase
    const sessionsRef = ref(db, `employees/${employeeId}/sessions/${date}`);
    const activitiesRef = ref(db, `employees/${employeeId}/activities/${date}`);
    const summaryRef = ref(db, `employees/${employeeId}/summaries/${date}`);
    const profileRef = ref(db, `employees/${employeeId}/profile`);

    const [sessionsSnap, activitiesSnap, summarySnap, profileSnap] =
      await Promise.all([
        get(sessionsRef),
        get(activitiesRef),
        get(summaryRef),
        get(profileRef),
      ]);

    const sessions = sessionsSnap.val() ? Object.values(sessionsSnap.val()) : [];
    const activities = activitiesSnap.val()
      ? Object.values(activitiesSnap.val())
      : [];
    const summary = summarySnap.val();
    const profile = profileSnap.val() || {};

    // Build sheet rows
    const rows: (string | number)[][] = [];

    // Header row
    rows.push([
      "Date",
      "Employee",
      "Email",
      "Role",
      "Department",
      "Total Active (min)",
      "Total Inactive (min)",
      "Tabs Opened",
      "Typing Events",
      "Copy Events",
      "Paste Events",
      "Click Events",
      "AI Summary",
    ]);

    // Data row
    const activeMin = Math.floor(
      sessions.reduce(
        (sum: number, s: any) => sum + (s.activeDuration || 0),
        0
      ) / 60000
    );
    const inactiveMin = Math.floor(
      sessions.reduce(
        (sum: number, s: any) => sum + (s.inactiveDuration || 0),
        0
      ) / 60000
    );

    const counts: Record<string, number> = {};
    for (const a of activities) {
      const type = (a as any).type;
      counts[type] = (counts[type] || 0) + 1;
    }

    rows.push([
      date,
      profile.name || "Unknown",
      profile.email || "",
      profile.role || "",
      profile.department || "",
      activeMin,
      inactiveMin,
      sessions.length,
      counts.typing || 0,
      counts.copy || 0,
      counts.paste || 0,
      counts.click || 0,
      summary?.aiSummary || "",
    ]);

    // Add tab detail rows
    rows.push([]);
    rows.push(["Tab Title", "URL", "Active (min)", "Inactive (min)"]);
    for (const s of sessions) {
      const session = s as any;
      rows.push([
        session.title || "",
        session.url || "",
        Math.floor((session.activeDuration || 0) / 60000),
        Math.floor((session.inactiveDuration || 0) / 60000),
      ]);
    }

    // Send to Google Sheets via Google Sheets API
    const googleApiKey = process.env.GOOGLE_API_KEY;
    const googleAccessToken = process.env.GOOGLE_ACCESS_TOKEN;

    if (googleAccessToken) {
      // Use OAuth access token
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${targetSheetId}/values/A1:append?valueInputOption=RAW`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${googleAccessToken}`,
          },
          body: JSON.stringify({
            values: rows,
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        return NextResponse.json(
          { error: `Google Sheets API error: ${errText}` },
          { status: 500 }
        );
      }

      const result = await response.json();
      return NextResponse.json({
        success: true,
        message: "Data exported to Google Sheets",
        updatedRange: result.updates?.updatedRange,
      });
    } else {
      // No credentials - return the data for manual export
      return NextResponse.json({
        success: false,
        message: "Google Sheets credentials not configured. Set GOOGLE_ACCESS_TOKEN in env.",
        data: rows,
        sheetUrl: `https://docs.google.com/spreadsheets/d/${targetSheetId}/edit`,
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to export to Google Sheets" },
      { status: 500 }
    );
  }
}
