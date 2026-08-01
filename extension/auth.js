/* ============================================================
   auth.js — Login / Signup for Quasara Track Extension
   Uses Firebase REST API (no SDK needed — works in popup)

   Employees are stored at: employees/{empId}/profile
   Admins are stored at:   users/{userId}
   ============================================================ */

// bcryptjs CDN exposes dcodeIO.bcrypt — alias it to bcrypt
const bcrypt = (typeof dcodeIO !== "undefined" && dcodeIO.bcrypt) ? dcodeIO.bcrypt : null;

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

async function dbPush(path, data) {
  const res = await fetch(`${DB_URL}/${path}.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`DB PUSH ${path} failed: ${res.status}`);
  return res.json(); // returns { name: "newKey" }
}

// ---- Session management ----

async function getAuthSession() {
  const result = await chrome.storage.local.get("authSession");
  return result.authSession || null;
}

async function setAuthSession(session) {
  await chrome.storage.local.set({ authSession: session });
}

async function clearAuthSession() {
  await chrome.storage.local.remove("authSession");
}

// ---- Clear all old local tracking data (fresh start on login/signup) ----
async function clearOldLocalData() {
  const all = await chrome.storage.local.get(null);
  const keysToRemove = Object.keys(all).filter(k => k.startsWith("day_"));
  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
    console.log("[Auth] Cleared old local data:", keysToRemove.length, "entries");
  }
}

// ---- Employee lookup ----

async function findEmployeeByEmail(email) {
  const all = await dbGet("employees");
  if (!all) return null;
  for (const empId of Object.keys(all)) {
    const profile = all[empId].profile;
    if (profile && profile.email && profile.email.toLowerCase() === email.toLowerCase()) {
      return { id: empId, ...profile };
    }
  }
  return null;
}

// ---- Create employee account ----

async function createEmployee(name, email, password) {
  if (!bcrypt) throw new Error("bcrypt library not loaded");

  // Check if email already exists
  const existing = await findEmployeeByEmail(email);
  if (existing) {
    throw new Error("An account with this email already exists");
  }

  // Hash password
  const passwordHash = bcrypt.hashSync(password, 10);

  // Create employee via REST API push
  const result = await dbPush("employees", {
    profile: {
      name: name,
      email: email.toLowerCase(),
      passwordHash: passwordHash,
      role: "employee",
      department: "",
      active: false,
      lastSeen: Date.now(),
      browser: "",
      os: "",
      currentTab: null,
      createdAt: Date.now(),
    },
  });

  const empId = result.name; // Firebase push key
  return { id: empId, name, email: email.toLowerCase(), role: "employee" };
}

// ---- Login ----

async function doLogin(email, password) {
  const employee = await findEmployeeByEmail(email);
  if (!employee) {
    throw new Error("No account found with this email");
  }

  if (!bcrypt) throw new Error("bcrypt library not loaded");
  const valid = bcrypt.compareSync(password, employee.passwordHash);
  if (!valid) {
    throw new Error("Incorrect password");
  }

  const session = {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    role: employee.role || "employee",
    loggedInAt: Date.now(),
  };
  await setAuthSession(session);

  // Clear old local data — fresh start
  await clearOldLocalData();

  // Set employee info in settings for background.js
  const settings = await getSettings();
  await saveSettings({
    ...settings,
    employeeName: employee.name,
    employeeEmail: employee.email,
    employeeId: employee.id,
  });

  return session;
}

// ---- Signup ----

async function doSignup(name, email, password) {
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }
  if (!name.trim()) {
    throw new Error("Please enter your name");
  }

  const employee = await createEmployee(name, email, password);

  const session = {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    role: employee.role || "employee",
    loggedInAt: Date.now(),
  };
  await setAuthSession(session);

  // Clear old local data — fresh start
  await clearOldLocalData();

  const settings = await getSettings();
  await saveSettings({
    ...settings,
    employeeName: employee.name,
    employeeEmail: employee.email,
    employeeId: employee.id,
  });

  return session;
}

// ---- Logout ----

async function doLogout() {
  const session = await getAuthSession();
  if (session) {
    chrome.runtime.sendMessage({ type: "USER_LOGOUT", employeeId: session.id, employeeName: session.name });
  }
  await clearAuthSession();
  await clearOldLocalData();
  const settings = await getSettings();
  await saveSettings({ ...settings, employeeName: "", employeeEmail: "", employeeId: "" });
}

// ---- UI helpers ----

function showAuthError(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.style.display = "block";
}

function hideAuthError(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.style.display = "none";
}

function setAuthButtonLoading(btnId, loading, originalText) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = originalText || btn.textContent;
    btn.innerHTML = '<span class="auth-spinner"></span> Please wait...';
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.originalText || originalText;
  }
}
