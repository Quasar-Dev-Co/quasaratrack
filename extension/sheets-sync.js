async function syncToSheets(appsScriptUrl, dailyData) {
  const payload = {
    employee: dailyData.employee,
    date: dailyData.date,
    totalActiveTime: dailyData.totalActiveTime,
    totalInactiveTime: dailyData.totalInactiveTime,
    totalKeystrokes: dailyData.totalKeystrokes,
    totalClicks: dailyData.totalClicks || 0,
    totalCopies: dailyData.totalCopies,
    totalPastes: dailyData.totalPastes,
    aiSummary: dailyData.aiSummary || "",
    actionLog: (dailyData.actionLog || []).map(a => ({
      time: a.time || "",
      action: a.action || "",
      domain: a.domain || "",
      label: a.label || "",
      href: a.href || ""
    })),
    tabs: dailyData.tabs.map(t => ({
      url: t.url,
      domain: t.domain,
      title: t.title,
      openedAt: t.openedAt,
      closedAt: t.closedAt || "",
      activeTime: t.activeTime || 0,
      inactiveTime: t.inactiveTime || 0,
      keystrokes: t.keystrokes || 0,
      clicks: t.clicks || 0,
      copies: t.copies || 0,
      pastes: t.pastes || 0,
      actionLog: (t.actionLog || []).map(a => ({
        time: a.time || "",
        action: a.action || "",
        label: a.label || "",
        href: a.href || ""
      }))
    }))
  };

  const response = await fetch(appsScriptUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Sheets sync error: ${response.status}`);
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { result: text };
  }
}
