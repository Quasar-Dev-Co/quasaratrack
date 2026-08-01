export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ref, get } from "firebase/database";
import { db } from "@/lib/firebase";

export async function POST(request: NextRequest) {
  try {
    const { employeeId, date } = await request.json();

    if (!employeeId || !date) {
      return NextResponse.json(
        { error: "employeeId and date are required" },
        { status: 400 }
      );
    }

    // Fetch sessions and activities from Firebase
    const sessionsRef = ref(db, `employees/${employeeId}/sessions/${date}`);
    const activitiesRef = ref(db, `employees/${employeeId}/activities/${date}`);

    const [sessionsSnap, activitiesSnap] = await Promise.all([
      get(sessionsRef),
      get(activitiesRef),
    ]);

    const sessions = sessionsSnap.val() ? Object.values(sessionsSnap.val()) : [];
    const activities = activitiesSnap.val()
      ? Object.values(activitiesSnap.val())
      : [];

    // Calculate stats
    const totalActiveTime = sessions.reduce(
      (sum: number, s: any) => sum + (s.activeDuration || 0),
      0
    );
    const totalInactiveTime = sessions.reduce(
      (sum: number, s: any) => sum + (s.inactiveDuration || 0),
      0
    );

    // Sort tabs by active duration
    const topTabs = [...sessions]
      .sort((a: any, b: any) => (b.activeDuration || 0) - (a.activeDuration || 0))
      .slice(0, 10);

    // Count activity types
    const activityCounts: Record<string, number> = {};
    for (const a of activities) {
      const type = (a as any).type;
      activityCounts[type] = (activityCounts[type] || 0) + 1;
    }

    // Build prompt for AI
    const prompt = buildSummaryPrompt(
      sessions,
      activities,
      totalActiveTime,
      totalInactiveTime,
      activityCounts
    );

    // Call AI API (OpenAI or Gemini)
    const aiApiKey = process.env.AI_API_KEY;
    let aiSummary = "";

    if (aiApiKey) {
      aiSummary = await callAI(prompt, aiApiKey);
    } else {
      // Fallback: generate a basic summary without AI
      aiSummary = generateBasicSummary(
        sessions,
        activities,
        totalActiveTime,
        totalInactiveTime,
        activityCounts
      );
    }

    // Save summary to Firebase
    const summaryRef = ref(db, `employees/${employeeId}/summaries/${date}`);
    const { set } = await import("firebase/database");
    await set(summaryRef, {
      date,
      employeeId,
      totalActiveTime,
      totalInactiveTime,
      tabsUsed: sessions.length,
      topTabs,
      activities: activities.slice(0, 100),
      aiSummary,
      generatedAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      summary: aiSummary,
      stats: {
        totalActiveTime,
        totalInactiveTime,
        tabsUsed: sessions.length,
        activityCounts,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate summary" },
      { status: 500 }
    );
  }
}

function buildSummaryPrompt(
  sessions: any[],
  activities: any[],
  totalActive: number,
  totalInactive: number,
  activityCounts: Record<string, number>
): string {
  const topSites = sessions
    .sort((a, b) => (b.activeDuration || 0) - (a.activeDuration || 0))
    .slice(0, 10)
    .map((s) => `- ${s.title || s.url}: ${Math.floor((s.activeDuration || 0) / 60000)}m active, ${Math.floor((s.inactiveDuration || 0) / 60000)}m inactive`)
    .join("\n");

  return `You are an AI assistant analyzing employee productivity data. Generate a concise daily summary.

Employee Activity Data:
- Total Active Time: ${Math.floor(totalActive / 60000)} minutes
- Total Inactive/Idle Time: ${Math.floor(totalInactive / 60000)} minutes
- Total Tabs Opened: ${sessions.length}
- Activity Events: ${JSON.stringify(activityCounts)}

Top Websites Visited:
${topSites}

Recent Activity Samples:
${activities.slice(-20).map((a) => `- [${a.type}] on ${a.url}: ${a.value || ""}`).join("\n")}

Please generate a professional summary of what the employee did today, including:
1. Overall productivity assessment
2. Key websites/tools used and for how long
3. Activity patterns (typing, copy/paste behavior)
4. Idle time analysis
5. Recommendations

Keep it concise (3-5 paragraphs).`;
}

async function callAI(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a productivity analysis assistant. Generate clear, professional daily activity summaries for employees.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

function generateBasicSummary(
  sessions: any[],
  activities: any[],
  totalActive: number,
  totalInactive: number,
  activityCounts: Record<string, number>
): string {
  const activeMin = Math.floor(totalActive / 60000);
  const inactiveMin = Math.floor(totalInactive / 60000);
  const topSite = sessions.sort(
    (a, b) => (b.activeDuration || 0) - (a.activeDuration || 0)
  )[0];

  return `Daily Activity Summary:

The employee was active for ${activeMin} minutes and inactive for ${inactiveMin} minutes today. They opened ${sessions.length} tabs in total.

${topSite ? `The most used website was "${topSite.title || topSite.url}" with ${Math.floor((topSite.activeDuration || 0) / 60000)} minutes of active time.` : ""}

Activity breakdown: ${Object.entries(activityCounts).map(([k, v]) => `${k}: ${v}`).join(", ")}

Note: Set AI_API_KEY in your environment variables to get AI-powered detailed summaries.`;
}
