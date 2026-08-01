async function generateAISummary(dailyData, apiKey) {
  const fmtDur = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const totalActiveH = fmtDur(dailyData.totalActiveTime || 0);
  const totalInactiveH = fmtDur(dailyData.totalInactiveTime || 0);

  const tabSummaries = dailyData.tabs.map(t => {
    const activeMin = fmtDur(t.activeTime || 0);
    const inactiveMin = fmtDur(t.inactiveTime || 0);
    let s = `- ${t.domain} | "${t.title}" | Active: ${activeMin}, Inactive: ${inactiveMin}, Keys: ${t.keystrokes || 0}, Clicks: ${t.clicks || 0}, Copies: ${t.copies || 0}, Pastes: ${t.pastes || 0}`;
    if (t.actionLog && t.actionLog.length > 0) {
      const actions = t.actionLog.slice(0, 20).map(a => `    [${a.time}] ${a.action}: ${a.label || ""}${a.href ? " -> " + a.href : ""}`).join("\n");
      s += "\n" + actions;
    }
    return s;
  }).join("\n\n");

  const fullActionLog = (dailyData.actionLog || []).slice(0, 100).map(a => {
    return `[${a.time}] ${a.action} on ${a.domain || "unknown"}: ${a.label || ""}${a.href ? " -> " + a.href : ""}`;
  }).join("\n");

  const prompt = `Analyze this employee's workday data and produce a CONCISE structured summary.

EMPLOYEE: ${dailyData.employee}
DATE: ${dailyData.date}
ACTIVE TIME: ${totalActiveH}
INACTIVE TIME: ${totalInactiveH}
KEYSTROKES: ${dailyData.totalKeystrokes || 0}
CLICKS: ${dailyData.totalClicks || 0}
COPIES: ${dailyData.totalCopies || 0}
PASTES: ${dailyData.totalPastes || 0}
TABS: ${dailyData.tabs.length}

TABS:
${tabSummaries}

ACTION LOG:
${fullActionLog || "No actions logged."}

Return a JSON object with this exact structure:
{
  "headline": "One punchy sentence (max 15 words) summarizing the day",
  "productivityScore": number 0-100,
  "productivityLabel": "Low" | "Medium" | "High" | "Excellent",
  "overview": "2-3 sentences max. What was the main focus of the day?",
  "tasks": [
    {"name": "Short task name", "tool": "domain or app used", "duration": "e.g. 1h 30m", "actions": ["button clicked X", "submitted form Y"], "outcome": "what was likely achieved"}
  ],
  "topSites": [
    {"domain": "example.com", "time": "1h 20m", "category": "Development" | "Research" | "Communication" | "Social" | "Other"}
  ],
  "timeline": [
    {"time": "09:15", "event": "Short event description"}
  ],
  "metrics": {
    "activeRatio": "e.g. 85%",
    "typingIntensity": "e.g. High/Medium/Low with keystrokes/hr",
    "copyPasteRatio": "e.g. 3:1 (research-heavy)",
    "tabSwitchRate": "e.g. Moderate"
  },
  "idlePeriods": [
    {"start": "12:00", "end": "12:45", "duration": "45m", "likely": "Lunch break"}
  ],
  "strengths": ["Short bullet point 1", "Short bullet point 2"],
  "concerns": ["Short bullet point 1"],
  "recommendations": ["Short actionable tip 1", "Short actionable tip 2"]
}

RULES:
- Keep ALL text SHORT and PUNCHY. No long paragraphs.
- Tasks: max 5 entries, each action max 8 words
- Timeline: max 8 entries
- Top sites: max 5 entries
- Strengths/Concerns/Recommendations: max 3 bullet points each, max 12 words each
- Be specific — reference actual domains and actions from the data
- Return ONLY valid JSON, no markdown, no explanation`;

  let lastError = null;
  let response = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a concise employee productivity analyst. Always return valid JSON only, no markdown, no extra text." },
            { role: "user", content: prompt }
          ],
          max_tokens: 1500,
          temperature: 0.5,
          response_format: { type: "json_object" }
        })
      });
      break;
    } catch (fetchErr) {
      lastError = fetchErr;
      if (attempt === 0) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  if (!response) {
    throw new Error(`Network error calling OpenAI: ${lastError?.message || "Failed to fetch"}. Check your network connection and API key.`);
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${err}`);
  }

  const json = await response.json();
  const content = json.choices[0].message.content;

  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed);
  } catch (e) {
    return JSON.stringify({
      headline: "Summary generated (raw)",
      productivityScore: 0,
      productivityLabel: "Unknown",
      overview: content,
      tasks: [],
      topSites: [],
      timeline: [],
      metrics: {},
      idlePeriods: [],
      strengths: [],
      concerns: [],
      recommendations: []
    });
  }
}
