importScripts(
  "firebase-sync.js",
  "settings.js",
  "ai-summary.js",
  "sheets-sync.js"
);

let activeTabId = null;
let activeTabActivateTime = Date.now();
let lastActivityTime = Date.now();
let isIdle = false;
let pendingCounts = { keystrokes: 0, copies: 0, pastes: 0, clicks: 0, actionLog: [] };

// Serialization lock — prevents concurrent flushActiveTabTime calls from
// reading stale Firebase data and overwriting each other
let flushInProgress = false;
let flushQueued = false;

async function flushActiveTabTime() {
  // If a flush is already running, queue another one
  if (flushInProgress) {
    flushQueued = true;
    return;
  }
  flushInProgress = true;

  try {
    await doFlush();
  } finally {
    flushInProgress = false;
    // If another flush was queued while we were running, flush again
    if (flushQueued) {
      flushQueued = false;
      flushActiveTabTime();
    }
  }
}

async function doFlush() {
  const empId = await getEmployeeId();
  if (!empId) return;

  // Snapshot pending counts and clear immediately (atomic)
  const counts = pendingCounts;
  pendingCounts = { keystrokes: 0, copies: 0, pastes: 0, clicks: 0, actionLog: [] };

  const dateKey = getTodayKeyStr();
  let data = await getLiveData(empId, dateKey);
  if (!data) {
    const name = await getEmployeeName();
    data = {
      date: dateKey,
      employee: name || "Unknown",
      tabs: [],
      totalActiveTime: 0,
      totalInactiveTime: 0,
      totalKeystrokes: 0,
      totalCopies: 0,
      totalPastes: 0,
      totalClicks: 0,
      aiSummary: null,
      synced: false,
      actionLog: []
    };
  }
  // Firebase removes empty arrays — restore them
  if (!data.tabs) data.tabs = [];
  if (!data.actionLog) data.actionLog = [];
  if (data.totalActiveTime == null) data.totalActiveTime = 0;
  if (data.totalInactiveTime == null) data.totalInactiveTime = 0;
  if (data.totalKeystrokes == null) data.totalKeystrokes = 0;
  if (data.totalCopies == null) data.totalCopies = 0;
  if (data.totalPastes == null) data.totalPastes = 0;
  if (data.totalClicks == null) data.totalClicks = 0;

  // If no active tab, just save pending counts to totals
  if (!activeTabId) {
    if (counts.keystrokes > 0 || counts.clicks > 0 || counts.copies > 0 || counts.pastes > 0) {
      data.totalKeystrokes += counts.keystrokes;
      data.totalCopies += counts.copies;
      data.totalPastes += counts.pastes;
      data.totalClicks += counts.clicks;
      if (counts.actionLog && counts.actionLog.length > 0) {
        data.actionLog.push(...counts.actionLog);
      }
      await saveLiveData(empId, dateKey, data);
    }
    return;
  }

  // Get current tab info
  let tab = null;
  try { tab = await chrome.tabs.get(activeTabId); } catch {}
  const entry = findOrCreateTabEntry(data, activeTabId, tab?.url || "", tab?.title || "");

  // Add elapsed time
  const now = Date.now();
  const elapsed = Math.floor((now - activeTabActivateTime) / 1000);
  if (isIdle) {
    entry.inactiveTime += elapsed;
  } else {
    entry.activeTime += elapsed;
  }

  // Add pending counts to tab entry
  entry.keystrokes += counts.keystrokes;
  entry.copies += counts.copies;
  entry.pastes += counts.pastes;
  entry.clicks += counts.clicks;
  if (counts.actionLog && counts.actionLog.length > 0) {
    entry.actionLog = entry.actionLog || [];
    entry.actionLog.push(...counts.actionLog);
    data.actionLog.push(...counts.actionLog.map(a => ({ ...a, domain: entry.domain, tabTitle: entry.title })));
  }

  // Update totals
  data.totalKeystrokes += counts.keystrokes;
  data.totalCopies += counts.copies;
  data.totalPastes += counts.pastes;
  data.totalClicks += counts.clicks;
  data.totalActiveTime = data.tabs.reduce((s, t) => s + (t.activeTime || 0), 0);
  data.totalInactiveTime = data.tabs.reduce((s, t) => s + (t.inactiveTime || 0), 0);

  await saveLiveData(empId, dateKey, data);
  activeTabActivateTime = now;

  if (counts.keystrokes > 0 || counts.clicks > 0 || counts.copies > 0 || counts.pastes > 0) {
    console.log("[BG] Flushed counts: keys=", counts.keystrokes, "clicks=", counts.clicks, "copies=", counts.copies, "pastes=", counts.pastes, "→ totals: keys=", data.totalKeystrokes, "clicks=", data.totalClicks, "copies=", data.totalCopies, "pastes=", data.totalPastes);
  }
}

function getDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return "unknown";
  }
}

function getTodayKeyStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nowTimeStr() {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ---- ACTIVE / INACTIVE LOGIC ----
// SIMPLE RULE:
//   User had activity (mouse, keyboard, scroll, click) in last 5 minutes → ACTIVE
//   No activity for 5 minutes → INACTIVE
// That's it. No window focus check, no browser open check.
// The content script sends ACTIVITY messages on every mouse move, key press, scroll, click.
const ACTIVITY_THRESHOLD_MIN = 5;
const ACTIVITY_THRESHOLD_MS = ACTIVITY_THRESHOLD_MIN * 60 * 1000;

function isUserActive() {
  const sinceActivity = Date.now() - lastActivityTime;
  return sinceActivity < ACTIVITY_THRESHOLD_MS;
}

// ---- DATA LIVES IN FIREBASE — no local storage ----

async function ensureDayData() {
  const dateKey = getTodayKeyStr();
  const empId = await getEmployeeId();
  if (!empId) {
    console.log("[BG] ensureDayData: no employee ID");
    return { dateKey, data: null };
  }

  let data = await getLiveData(empId, dateKey);
  if (!data) {
    const name = await getEmployeeName();
    data = {
      date: dateKey,
      employee: name || "Unknown",
      tabs: [],
      totalActiveTime: 0,
      totalInactiveTime: 0,
      totalKeystrokes: 0,
      totalCopies: 0,
      totalPastes: 0,
      totalClicks: 0,
      aiSummary: null,
      synced: false,
      actionLog: []
    };
    await saveLiveData(empId, dateKey, data);
    console.log("[BG] ensureDayData: created new day data for", empId, dateKey);
  }
  // Firebase removes empty arrays — restore them if missing
  if (!data.tabs) data.tabs = [];
  if (!data.actionLog) data.actionLog = [];
  if (data.totalActiveTime == null) data.totalActiveTime = 0;
  if (data.totalInactiveTime == null) data.totalInactiveTime = 0;
  if (data.totalKeystrokes == null) data.totalKeystrokes = 0;
  if (data.totalCopies == null) data.totalCopies = 0;
  if (data.totalPastes == null) data.totalPastes = 0;
  if (data.totalClicks == null) data.totalClicks = 0;
  return { dateKey, data };
}

function findOrCreateTabEntry(data, tabId, url, title) {
  if (!data.tabs) data.tabs = [];
  let entry = data.tabs.find(t => t.tabId === tabId && !t.closedAt);
  if (!entry) {
    entry = {
      tabId,
      url: url || "",
      domain: getDomain(url),
      title: title || "",
      openedAt: nowTimeStr(),
      closedAt: null,
      activeTime: 0,
      inactiveTime: 0,
      keystrokes: 0,
      copies: 0,
      pastes: 0,
      clicks: 0,
      inactivePeriods: [],
      actionLog: []
    };
    data.tabs.push(entry);
  }
  return entry;
}

async function setActiveTab(tabId) {
  if (tabId === activeTabId) return;
  await flushActiveTabTime();
  activeTabId = tabId;
  activeTabActivateTime = Date.now();
  isIdle = false;
  lastActivityTime = Date.now();

  try {
    const empId = await getEmployeeId();
    if (!empId) return;

    const tab = await chrome.tabs.get(tabId);
    const { dateKey, data } = await ensureDayData();
    if (!data) return;
    findOrCreateTabEntry(data, tabId, tab.url, tab.title);
    await saveLiveData(empId, dateKey, data);

    // Real-time presence update
    syncPresence(empId, tab, false);
  } catch (e) {
    console.error("[BG] setActiveTab error:", e.message);
  }
}

async function closeTabEntry(tabId) {
  if (tabId === activeTabId) {
    await flushActiveTabTime();
    activeTabId = null;
  }
  const { dateKey, data } = await ensureDayData();
  if (!data) return;
  const entry = data.tabs.find(t => t.tabId === tabId && !t.closedAt);
  if (entry) {
    entry.closedAt = nowTimeStr();
    const empId = await getEmployeeId();
    await saveLiveData(empId, dateKey, data);
  }
  delete tabData[tabId];
}

async function updateTabInfo(tabId, changeInfo) {
  if (changeInfo.url || changeInfo.title) {
    const { dateKey, data } = await ensureDayData();
    if (!data) return;
    const entry = data.tabs.find(t => t.tabId === tabId && !t.closedAt);
    if (entry) {
      if (changeInfo.url) {
        entry.url = changeInfo.url;
        entry.domain = getDomain(changeInfo.url);
      }
      if (changeInfo.title) entry.title = changeInfo.title;
      const empId = await getEmployeeId();
      await saveLiveData(empId, dateKey, data);
    }
  }
}

async function checkIdle() {
  const now = Date.now();
  const sinceActivity = now - lastActivityTime;
  const shouldIdle = sinceActivity >= ACTIVITY_THRESHOLD_MS;

  if (shouldIdle && !isIdle) {
    // Transition: ACTIVE → INACTIVE (no activity for 5 minutes)
    console.log("[BG] User went INACTIVE (no activity for", Math.floor(sinceActivity / 1000), "s)");
    isIdle = true;
    await flushActiveTabTime();
    const idleStart = nowTimeStr();
    if (activeTabId) {
      const { dateKey, data } = await ensureDayData();
      if (data) {
        const entry = data.tabs.find(t => t.tabId === activeTabId && !t.closedAt);
        if (entry) {
          entry.inactivePeriods.push({ start: idleStart, end: null });
          const empId = await getEmployeeId();
          await saveLiveData(empId, dateKey, data);
        }
      }
    }
    const empId = await getEmployeeId();
    if (empId) {
      try {
        const tab = activeTabId ? await chrome.tabs.get(activeTabId) : null;
        syncPresence(empId, tab, true);
      } catch {
        syncPresence(empId, null, true);
      }
    }
  } else if (!shouldIdle && isIdle) {
    // Transition: INACTIVE → ACTIVE (activity detected again)
    console.log("[BG] User went ACTIVE (activity detected)");
    isIdle = false;
    await flushActiveTabTime();
    if (activeTabId) {
      const { dateKey, data } = await ensureDayData();
      if (data) {
        const entry = data.tabs.find(t => t.tabId === activeTabId && !t.closedAt);
        if (entry && entry.inactivePeriods.length > 0) {
          const last = entry.inactivePeriods[entry.inactivePeriods.length - 1];
          if (!last.end) last.end = nowTimeStr();
          const empId = await getEmployeeId();
          await saveLiveData(empId, dateKey, data);
        }
      }
    }
    const empId = await getEmployeeId();
    if (empId) {
      try {
        const tab = activeTabId ? await chrome.tabs.get(activeTabId) : null;
        syncPresence(empId, tab, false);
      } catch {
        syncPresence(empId, null, false);
      }
    }
  }
}

async function handleAutoSync() {
  const settings = await getSettings();
  if (!settings.autoSyncEnabled) return;
  const dateKey = getTodayKeyStr();
  const empId = await getEmployeeId();
  if (!empId) return;
  const data = await getLiveData(empId, dateKey);
  if (!data || data.synced) return;

  const now = new Date();
  const currentTime = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
  if (currentTime >= settings.autoSyncTime) {
    await triggerSync();
  }
}

async function flushAllContentScripts() {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("chrome-extension://") && !tab.url.startsWith("edge://") && !tab.url.startsWith("about:")) {
        try {
          await chrome.tabs.sendMessage(tab.id, { type: "FLUSH_CONTENT" });
        } catch {}
      }
    }
  } catch {}
  await new Promise(r => setTimeout(r, 500));
  await flushActiveTabTime();
}

async function triggerSync() {
  const dateKey = getTodayKeyStr();
  const empId = await getEmployeeId();
  if (!empId) return null;

  await flushAllContentScripts();

  let data = await getLiveData(empId, dateKey);
  if (!data) {
    const settings = await getSettings();
    const name = await getEmployeeName();
    data = {
      date: dateKey,
      employee: name || settings.employeeName || "Unknown",
      tabs: [],
      totalActiveTime: 0,
      totalInactiveTime: 0,
      totalKeystrokes: 0,
      totalCopies: 0,
      totalPastes: 0,
      totalClicks: 0,
      aiSummary: null,
      synced: false,
      actionLog: []
    };
  }

  const settings = await getSettings();

  if (settings.openaiApiKey) {
    try {
      data.aiSummary = await generateAISummary(data, settings.openaiApiKey);
    } catch (e) {
      console.error("AI summary error:", e);
      data.aiSummary = JSON.stringify({
        headline: "Summary generation failed",
        productivityScore: 0,
        productivityLabel: "Error",
        overview: e.message || "Unknown error",
        tasks: [], topSites: [], timeline: [], metrics: {}, idlePeriods: [],
        strengths: [], concerns: ["AI summary failed"], recommendations: ["Check OpenAI API key"]
      });
    }
  }

  if (settings.appsScriptUrl) {
    try {
      await syncToSheets(settings.appsScriptUrl, data);
      data.synced = true;
    } catch (e) {
      console.error("Sheets sync error:", e);
    }
  }

  // Save back to Firebase (with AI summary)
  await saveLiveData(empId, dateKey, data);

  return data;
}

// ---- Event listeners ----

chrome.tabs.onActivated.addListener((activeInfo) => {
  setActiveTab(activeInfo.tabId);
});

// Window removed — mark inactive when browser closes
chrome.windows.onRemoved.addListener(async () => {
  const windows = await chrome.windows.getAll();
  if (windows.length === 0) {
    // Last window closed → browser closing → mark inactive
    isIdle = true;
    await flushActiveTabTime();
    const empId = await getEmployeeId();
    if (empId) markInactive(empId);
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  ensureDayData().then(({ dateKey, data }) => {
    if (!data) return;
    findOrCreateTabEntry(data, tab.id, tab.url, tab.title);
    getEmployeeId().then(empId => saveLiveData(empId, dateKey, data));
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    updateTabInfo(tabId, { url: tab.url, title: tab.title });
    // Inject content script into the tab if it hasn't been injected
    if (tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("chrome-extension://") &&
        !tab.url.startsWith("edge://") && !tab.url.startsWith("about:")) {
      chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"]
      }).catch(() => {}); // ignore if already injected
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  closeTabEntry(tabId);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "ACTIVITY") {
    lastActivityTime = msg.timestamp || Date.now();
    if (isIdle) {
      // User came back — transition to active
      console.log("[BG] ACTIVITY received — waking up from idle");
      isIdle = false;
      flushActiveTabTime();
      getEmployeeId().then(empId => {
        if (empId) {
          chrome.tabs.get(activeTabId).then(tab => {
            syncPresence(empId, tab, false);
          }).catch(() => syncPresence(empId, null, false));
        }
      });
    }
  } else if (msg.type === "COUNTS") {
    pendingCounts.keystrokes += msg.keystrokes || 0;
    pendingCounts.copies += msg.copies || 0;
    pendingCounts.pastes += msg.pastes || 0;
    pendingCounts.clicks += msg.clicks || 0;
    if (msg.actionLog && msg.actionLog.length > 0) {
      pendingCounts.actionLog = pendingCounts.actionLog || [];
      pendingCounts.actionLog.push(...msg.actionLog);
    }
    console.log("[BG] COUNTS received: keys=", msg.keystrokes, "clicks=", msg.clicks, "copies=", msg.copies, "pastes=", msg.pastes);
    // Flush immediately so Firebase updates in real-time
    flushActiveTabTime();
  } else if (msg.type === "TRIGGER_SYNC") {
    triggerSync().then((data) => sendResponse({ success: true, data: data })).catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  } else if (msg.type === "GET_TODAY_STATS") {
    // Read directly from Firebase — no local storage
    flushActiveTabTime().then(async () => {
      const dateKey = getTodayKeyStr();
      const empId = await getEmployeeId();
      if (!empId) {
        console.log("[BG] GET_TODAY_STATS: no employee ID");
        sendResponse({ tabs: [], actionLog: [], totalActiveTime: 0, totalInactiveTime: 0, totalKeystrokes: 0, totalClicks: 0, totalCopies: 0, totalPastes: 0, activeTabId });
        return;
      }
      let data = await getLiveData(empId, dateKey);
      if (!data) {
        // Create initial data for today
        const name = await getEmployeeName();
        data = {
          date: dateKey,
          employee: name || "Unknown",
          tabs: [],
          totalActiveTime: 0,
          totalInactiveTime: 0,
          totalKeystrokes: 0,
          totalCopies: 0,
          totalPastes: 0,
          totalClicks: 0,
          aiSummary: null,
          synced: false,
          actionLog: []
        };
        await saveLiveData(empId, dateKey, data);
      }
      // Firebase removes empty arrays — restore them
      if (!data.tabs) data.tabs = [];
      if (!data.actionLog) data.actionLog = [];
      if (data.totalActiveTime == null) data.totalActiveTime = 0;
      if (data.totalInactiveTime == null) data.totalInactiveTime = 0;
      if (data.totalKeystrokes == null) data.totalKeystrokes = 0;
      if (data.totalClicks == null) data.totalClicks = 0;
      if (data.totalCopies == null) data.totalCopies = 0;
      if (data.totalPastes == null) data.totalPastes = 0;
      console.log("[BG] GET_TODAY_STATS: returning", data.tabs.length, "tabs, active:", data.totalActiveTime, "s");
      sendResponse({ ...data, activeTabId });
    });
    return true;
  } else if (msg.type === "FLUSH") {
    flushActiveTabTime().then(() => sendResponse({ success: true }));
    return true;
  } else if (msg.type === "GET_ACTION_LOG") {
    flushActiveTabTime().then(async () => {
      const dateKey = getTodayKeyStr();
      const empId = await getEmployeeId();
      if (!empId) { sendResponse([]); return; }
      const data = await getLiveData(empId, dateKey);
      sendResponse(data?.actionLog || []);
    });
    return true;
  } else if (msg.type === "SYNC_PROFILE") {
    if (msg.employeeId) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        syncProfile(msg.employeeId, msg.employeeName, tabs[0] || null, false);
      });
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: "No employee ID" });
    }
    return true;
  } else if (msg.type === "USER_LOGOUT") {
    if (msg.employeeId) {
      markInactive(msg.employeeId);
    }
    sendResponse({ success: true });
    return true;
  }
});

// ---- Alarms ----
chrome.alarms.create("idleCheck", { periodInMinutes: 0.25 });
chrome.alarms.create("realtimeSync", { periodInMinutes: 0.25 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "idleCheck") {
    checkIdle();
  } else if (alarm.name === "realtimeSync") {
    // Flush + save to Firebase every 15 seconds
    flushActiveTabTime();
  }
});

// Inject content script into all existing tabs (handles already-open tabs after extension reload)
async function injectContentScriptIntoAllTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      // Skip chrome://, chrome-extension://, edge://, about: pages
      if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://") ||
          tab.url.startsWith("edge://") || tab.url.startsWith("about:") || tab.url.startsWith("https://chrome.google.com")) {
        continue;
      }
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"]
        });
        console.log("[BG] Injected content script into tab", tab.id, tab.url);
      } catch (e) {
        // Tab might not be ready or might not allow injection
      }
    }
  } catch (e) {
    console.error("[BG] injectContentScriptIntoAllTabs error:", e.message);
  }
}

// ---- Startup ----

chrome.runtime.onStartup.addListener(() => {
  // Browser just opened — mark as active
  lastActivityTime = Date.now();
  isIdle = false;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) setActiveTab(tabs[0].id);
  });
  getEmployeeId().then(empId => {
    if (empId) {
      getEmployeeName().then(name => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          syncProfile(empId, name, tabs[0] || null, false);
        });
      });
    }
  });
});

// Service worker started (extension loaded or reloaded)
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  lastActivityTime = Date.now();
  isIdle = false;

  if (tabs[0]) setActiveTab(tabs[0].id);
  getEmployeeId().then(empId => {
    if (empId) {
      getEmployeeName().then(name => {
        syncProfile(empId, name, tabs[0] || null, false);
      });
    }
  });
});

// Inject content script into all already-open tabs (after extension reload)
injectContentScriptIntoAllTabs();

// Flush + save to Firebase every 15 seconds
setInterval(() => {
  flushActiveTabTime();
}, 15000);

// Mark inactive when service worker is about to be suspended
chrome.runtime.onSuspend?.addListener(() => {
  getEmployeeId().then(empId => {
    if (empId) {
      markInactive(empId);
    }
  });
});
