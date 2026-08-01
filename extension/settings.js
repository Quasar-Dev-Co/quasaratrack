const DEFAULT_SETTINGS = {
  employeeName: "",
  openaiApiKey: "",
  appsScriptUrl: "",
  idleThresholdMinutes: 5,
  autoSyncEnabled: true,
  autoSyncTime: "18:00"
};

async function getSettings() {
  const result = await chrome.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...(result.settings || {}) };
}

async function saveSettings(settings) {
  const current = await getSettings();
  const merged = { ...current, ...settings };
  await chrome.storage.local.set({ settings: merged });
  return merged;
}

async function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function getDailyData(dateKey) {
  if (!dateKey) dateKey = await getTodayKey();
  const result = await chrome.storage.local.get(`day_${dateKey}`);
  return result[`day_${dateKey}`] || null;
}

async function saveDailyData(dateKey, data) {
  await chrome.storage.local.set({ [`day_${dateKey}`]: data });
}

async function getAllDailyData() {
  const all = await chrome.storage.local.get(null);
  const days = {};
  for (const key of Object.keys(all)) {
    if (key.startsWith("day_")) {
      days[key.substring(4)] = all[key];
    }
  }
  return days;
}
