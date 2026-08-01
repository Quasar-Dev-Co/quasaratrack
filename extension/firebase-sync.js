/* ============================================================
   firebase-sync.js — ALL data lives in Firebase RTDB (no local storage)
   Uses Firebase REST API (works perfectly in MV3 service workers)

   Structure:
     employees/{empId}/profile           → name, email, active, currentTab, lastSeen
     employees/{empId}/days/{dateKey}     → LIVE working data (tabs, totals, actionLog, aiSummary)
     employees/{empId}/sessions/{dateKey} → final session summary
     employees/{empId}/activities/{dateKey} → tab-level details
     employees/{empId}/summaries/{dateKey}  → AI summary JSON
   ============================================================ */

const DB_URL = "https://quasaratrack-default-rtdb.firebaseio.com";

// ---- REST API helpers ----

async function dbGet(path) {
  const res = await fetch(`${DB_URL}/${path}.json`);
  if (!res.ok) throw new Error(`DB GET ${path} failed: ${res.status}`);
  return res.json();
}

async function dbPut(path, data) {
  const res = await fetch(`${DB_URL}/${path}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`DB PUT ${path} failed: ${res.status}`);
  return res.json();
}

async function dbPatch(path, data) {
  const res = await fetch(`${DB_URL}/${path}.json`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`DB PATCH ${path} failed: ${res.status}`);
  return res.json();
}

async function dbPush(path, data) {
  const res = await fetch(`${DB_URL}/${path}.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`DB PUSH ${path} failed: ${res.status}`);
  return res.json();
}

// ---- Session helpers ----

async function getEmployeeId() {
  const result = await chrome.storage.local.get("authSession");
  return result.authSession?.id || null;
}

async function getEmployeeName() {
  const result = await chrome.storage.local.get("authSession");
  return result.authSession?.name || null;
}

// ---- LIVE DATA (replaces local storage) ----
// This is the single source of truth for today's tracking data.
// Both background.js and popup.js read/write here.

async function getLiveData(empId, dateKey) {
  if (!empId || !dateKey) return null;
  try {
    return await dbGet(`employees/${empId}/days/${dateKey}`);
  } catch (e) {
    console.error("[Firebase] getLiveData error:", e.message);
    return null;
  }
}

async function saveLiveData(empId, dateKey, data) {
  if (!empId || !dateKey) return;
  try {
    await dbPut(`employees/${empId}/days/${dateKey}`, data);
  } catch (e) {
    console.error("[Firebase] saveLiveData error:", e.message);
  }
}

// Patch only specific fields (faster, less data over wire)
async function patchLiveData(empId, dateKey, patch) {
  if (!empId || !dateKey) return;
  try {
    await dbPatch(`employees/${empId}/days/${dateKey}`, patch);
  } catch (e) {
    console.error("[Firebase] patchLiveData error:", e.message);
  }
}

// ---- Profile / Presence ----

async function syncProfile(employeeId, employeeName, activeTab, isIdle) {
  if (!employeeId) return;
  try {
    await dbPatch(`employees/${employeeId}/profile`, {
      name: employeeName || "",
      active: !isIdle,
      lastSeen: Date.now(),
      browser: getBrowserName(),
      os: getOSName(),
      currentTab: activeTab
        ? {
            url: activeTab.url || "",
            title: activeTab.title || "",
            favIconUrl: activeTab.favIconUrl || "",
            timestamp: Date.now(),
          }
        : null,
    });
  } catch (e) {
    console.error("[Firebase] Profile sync error:", e.message);
  }
}

async function syncPresence(employeeId, activeTab, isIdle) {
  if (!employeeId) return;
  try {
    await dbPatch(`employees/${employeeId}/profile`, {
      active: !isIdle,
      lastSeen: Date.now(),
      currentTab: activeTab
        ? {
            url: activeTab.url || "",
            title: activeTab.title || "",
            favIconUrl: activeTab.favIconUrl || "",
            timestamp: Date.now(),
          }
        : null,
    });
  } catch (e) {
    console.error("[Firebase] Presence sync error:", e.message);
  }
}

async function markInactive(employeeId) {
  if (!employeeId) return;
  try {
    await dbPatch(`employees/${employeeId}/profile`, {
      active: false,
      lastSeen: Date.now(),
      currentTab: null,
    });
  } catch (e) {
    console.error("[Firebase] markInactive error:", e.message);
  }
}

// ---- Helpers ----

function getBrowserName() {
  const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome/")) return "Chrome";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Safari/")) return "Safari";
  return "Unknown";
}

function getOSName() {
  const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  return "Unknown";
}

// Export for service worker
if (typeof self !== "undefined") {
  self.DB_URL = DB_URL;
  self.getEmployeeId = getEmployeeId;
  self.getEmployeeName = getEmployeeName;
  self.getLiveData = getLiveData;
  self.saveLiveData = saveLiveData;
  self.patchLiveData = patchLiveData;
  self.syncProfile = syncProfile;
  self.syncPresence = syncPresence;
  self.markInactive = markInactive;
  self.dbGet = dbGet;
  self.dbPut = dbPut;
  self.dbPatch = dbPatch;
  self.dbPush = dbPush;
}
