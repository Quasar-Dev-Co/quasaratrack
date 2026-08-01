/* ============================================================
   Quasara Track — Popup Logic (v3)
   Auth flow: show login/signup if not logged in,
   otherwise show tracking UI.
   ============================================================ */

let todayRefreshTimer = null;
let todayFirstLoad = true;

document.addEventListener("DOMContentLoaded", async () => {
  // ---- Check auth state ----
  const session = await getAuthSession();

  if (!session) {
    showAuthScreen();
    setupAuthUI();
    return;
  }

  // ---- User is logged in — show main app ----
  showMainApp(session);
  setupMainUI();
});

/* ============================================================
   AUTH UI
   ============================================================ */

function showAuthScreen() {
  document.getElementById("auth-screen").style.display = "flex";
  document.getElementById("main-app").style.display = "none";
}

function showMainApp(session) {
  document.getElementById("auth-screen").style.display = "none";
  document.getElementById("main-app").style.display = "block";

  // Fill user bar
  document.getElementById("user-name").textContent = session.name || "User";
  document.getElementById("user-email").textContent = session.email || "";
  document.getElementById("user-avatar").textContent = (session.name || "U").charAt(0).toUpperCase();
}

function setupAuthUI() {
  // Tab switching
  document.querySelectorAll(".auth-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".auth-tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.dataset.authTab;
      document.getElementById(`${target}-form`).classList.add("active");
      hideAuthError(`${target}-error`);
    });
  });

  // Login form
  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAuthError("login-error");
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    setAuthButtonLoading("login-submit", true, "Sign In");

    try {
      const session = await doLogin(email, password);
      setAuthButtonLoading("login-submit", false, "Sign In");
      showMainApp(session);
      setupMainUI();
      // Tell background to sync profile
      chrome.runtime.sendMessage({ type: "SYNC_PROFILE", employeeId: session.id, employeeName: session.name });
    } catch (err) {
      setAuthButtonLoading("login-submit", false, "Sign In");
      showAuthError("login-error", err.message);
    }
  });

  // Signup form
  document.getElementById("signup-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAuthError("signup-error");
    const name = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;

    setAuthButtonLoading("signup-submit", true, "Create Account");

    try {
      const session = await doSignup(name, email, password);
      setAuthButtonLoading("signup-submit", false, "Create Account");
      showMainApp(session);
      setupMainUI();
      // Tell background to sync profile
      chrome.runtime.sendMessage({ type: "SYNC_PROFILE", employeeId: session.id, employeeName: session.name });
    } catch (err) {
      setAuthButtonLoading("signup-submit", false, "Create Account");
      showAuthError("signup-error", err.message);
    }
  });
}

/* ============================================================
   MAIN APP UI
   ============================================================ */

async function setupMainUI() {
  const settings = await getSettings();

  renderTodayDate();

  showLoadingSkeleton();
  refreshToday();
  todayRefreshTimer = setInterval(refreshToday, 5000);

  document.getElementById("sync-btn").addEventListener("click", () => {
    triggerSync("sync-btn", "sync-status", () => {
      refreshToday();
    });
  });

  // Logout button
  document.getElementById("logout-btn").addEventListener("click", async () => {
    await doLogout();
    // Stop refresh timer
    if (todayRefreshTimer) clearInterval(todayRefreshTimer);
    // Show auth screen
    showAuthScreen();
    setupAuthUI();
  });
}

/* ============================================================
   HELPERS
   ============================================================ */

function fmtTime(sec) {
  sec = Math.floor(sec || 0);
  if (sec < 60) return `${sec}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function renderTodayDate() {
  const el = document.getElementById("today-date");
  if (!el) return;
  const d = new Date();
  const opts = { weekday: "long", month: "long", day: "numeric" };
  el.textContent = d.toLocaleDateString("en-US", opts);
}

function animateValue(el, endText, opts = {}) {
  const { duration = 800 } = opts;

  const numbers = [];
  const template = endText.replace(/[\d,]+/g, (match) => {
    const val = parseInt(match.replace(/,/g, ""), 10) || 0;
    numbers.push(val);
    return `\x00${numbers.length - 1}\x00`;
  });

  if (numbers.length === 0) {
    el.textContent = endText;
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "count-pop 0.4s cubic-bezier(0.22,1,0.36,1)";
    return;
  }

  const startTime = performance.now();
  const startVals = numbers.map(() => 0);

  function tick(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const currentVals = numbers.map((target, i) =>
      Math.round(startVals[i] + (target - startVals[i]) * eased)
    );
    el.textContent = template.replace(/\x00(\d+)\x00/g, (_, idx) =>
      currentVals[parseInt(idx, 10)].toLocaleString()
    );
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function showLoadingSkeleton() {
  const tabList = document.getElementById("tab-list");
  if (!tabList) return;
  tabList.innerHTML = Array(3).fill(0).map(() =>
    `<div class="skeleton-item">
      <div class="skeleton-line skeleton-w-60"></div>
      <div class="skeleton-line skeleton-w-90"></div>
      <div class="skeleton-line skeleton-w-40"></div>
    </div>`
  ).join("");
}

/* ============================================================
   TODAY TAB
   ============================================================ */

function refreshToday() {
  chrome.runtime.sendMessage({ type: "GET_TODAY_STATS" }, (data) => {
    if (!data) data = { tabs: [], actionLog: [] };
    if (!data.tabs) data.tabs = [];

    animateValue(document.getElementById("stat-active"), fmtTime(data.totalActiveTime || 0));
    animateValue(document.getElementById("stat-inactive"), fmtTime(data.totalInactiveTime || 0));
    animateValue(document.getElementById("stat-keystrokes"), (data.totalKeystrokes || 0).toLocaleString());
    animateValue(document.getElementById("stat-clicks"), (data.totalClicks || 0).toLocaleString());
    animateValue(document.getElementById("stat-cp"), `${data.totalCopies || 0} / ${data.totalPastes || 0}`);

    const statusText = document.getElementById("header-status-text");
    if (statusText) {
      const active = data.totalActiveTime || 0;
      statusText.textContent = active > 0 ? `Active · ${fmtTime(active)}` : "Tracking";
    }

    const countEl = document.getElementById("tab-count");
    if (countEl) {
      const openCount = data.tabs.filter(t => !t.closedAt).length;
      const totalCount = data.tabs.length;
      countEl.textContent = totalCount > 0
        ? `${totalCount} tab${totalCount !== 1 ? "s" : ""}${openCount ? ` · ${openCount} open` : ""}`
        : "";
    }

    const tabList = document.getElementById("tab-list");
    const activeTabId = data.activeTabId || null;

    if (data.tabs.length === 0) {
      tabList.innerHTML = '<div class="empty-state">No tabs tracked yet today.</div>';
    } else {
      const sorted = [...data.tabs].sort((a, b) => (b.activeTime || 0) - (a.activeTime || 0));
      tabList.innerHTML = sorted.map((t, i) => {
        const isActive = t.tabId === activeTabId && !t.closedAt;
        const isClosed = !!t.closedAt;
        const stateClass = isActive ? " tab-active" : (isClosed ? " tab-closed" : " tab-open");
        const stateBadge = isActive
          ? '<span class="tab-state-badge tab-state-active">● Active</span>'
          : (isClosed ? '<span class="tab-state-badge tab-state-closed">Closed</span>'
                      : '<span class="tab-state-badge tab-state-open">Open</span>');
        return `
        <div class="tab-item${stateClass}" style="animation-delay:${0.04 * i}s">
          <div class="tab-item-row">
            <div class="tab-item-domain">${escapeHtml(t.domain || "unknown")}</div>
            ${stateBadge}
          </div>
          <div class="tab-item-title">${escapeHtml(t.title || t.url || "")}</div>
          <div class="tab-item-stats">
            <span>Active: ${fmtTime(t.activeTime || 0)}</span>
            <span>Idle: ${fmtTime(t.inactiveTime || 0)}</span>
            <span>Keys: ${t.keystrokes || 0}</span>
            <span>Clicks: ${t.clicks || 0}</span>
            <span>C/P: ${(t.copies || 0)}/${(t.pastes || 0)}</span>
          </div>
        </div>`;
      }).join("");
    }

    const syncedEl = document.getElementById("synced-badge");
    if (syncedEl) {
      if (data.synced) {
        syncedEl.style.display = "inline-flex";
        syncedEl.className = "synced-badge synced-yes";
        syncedEl.textContent = "✓ Synced";
      } else {
        syncedEl.style.display = "inline-flex";
        syncedEl.className = "synced-badge synced-no";
        syncedEl.textContent = "Not synced yet";
      }
    }

    const aiSection = document.getElementById("ai-summary-section");
    if (data.aiSummary) {
      aiSection.style.display = "block";
      try {
        const ai = JSON.parse(data.aiSummary);
        document.getElementById("ai-summary-text").textContent = ai.headline
          ? `${ai.headline}\n\n${ai.overview || ""}`
          : data.aiSummary;
      } catch {
        document.getElementById("ai-summary-text").textContent = data.aiSummary;
      }
    } else {
      aiSection.style.display = "none";
    }

    todayFirstLoad = false;
  });
}

/* ============================================================
   SYNC
   ============================================================ */

function triggerSync(btnId, statusId, onSuccess) {
  const btn = document.getElementById(btnId);
  const status = document.getElementById(statusId);
  if (!btn || !status) return;
  btn.disabled = true;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<span class="sync-icon" style="animation: spin 1s linear infinite">&#x21bb;</span> Generating...';
  status.textContent = "Flushing data and calling OpenAI...";
  status.className = "sync-status";

  chrome.runtime.sendMessage({ type: "TRIGGER_SYNC" }, (response) => {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
    if (response && response.success) {
      status.textContent = "Summary generated & synced!";
      status.className = "sync-status success";
      if (onSuccess) onSuccess();
    } else {
      status.textContent = "Failed: " + (response?.error || "Unknown error");
      status.className = "sync-status error";
    }
    setTimeout(() => { status.textContent = ""; status.className = "sync-status"; }, 6000);
  });
}

/* ============================================================
   SUMMARY TAB
   ============================================================ */

function loadSummary() {
  chrome.runtime.sendMessage({ type: "GET_TODAY_STATS" }, (data) => {
    const emptyEl = document.getElementById("summary-empty");
    const richEl = document.getElementById("summary-rich");

    if (!data || !data.aiSummary) {
      emptyEl.style.display = "flex";
      richEl.style.display = "none";
      return;
    }

    let ai;
    try {
      ai = JSON.parse(data.aiSummary);
    } catch {
      ai = { headline: data.aiSummary, overview: "", productivityScore: 0 };
    }

    emptyEl.style.display = "none";
    richEl.style.display = "block";

    // Score ring
    const score = ai.productivityScore || 0;
    const ring = document.getElementById("score-ring-fill");
    const circumference = 213.6;
    const offset = circumference - (circumference * score / 100);
    ring.style.strokeDashoffset = offset;
    ring.style.stroke = score >= 75 ? "#34d399" : score >= 50 ? "#fbbf24" : "#f87171";
    document.getElementById("score-number").textContent = score;
    document.getElementById("score-label").textContent = ai.productivityLabel || "—";

    // Headline + overview
    document.getElementById("summary-headline").textContent = ai.headline || "";
    document.getElementById("summary-overview").textContent = ai.overview || "";

    // Metrics
    const metricsGrid = document.getElementById("metrics-grid");
    if (ai.metrics) {
      const entries = Object.entries(ai.metrics);
      metricsGrid.innerHTML = entries.map(([key, val]) =>
        `<div class="metric-card">
          <div class="metric-label">${escapeHtml(key)}</div>
          <div class="metric-value">${escapeHtml(String(val))}</div>
        </div>`
      ).join("");
    } else {
      metricsGrid.innerHTML = "";
    }

    // Tasks
    const tasksList = document.getElementById("tasks-list");
    tasksList.innerHTML = (ai.tasks || []).map(t =>
      `<div class="task-item">${escapeHtml(t)}</div>`
    ).join("") || '<div class="empty-state">No tasks detected.</div>';

    // Top sites
    const topsitesList = document.getElementById("topsites-list");
    topsitesList.innerHTML = (ai.topSites || []).map(s =>
      `<div class="topsite-item">
        <span class="topsite-domain">${escapeHtml(s.domain || s)}</span>
        <span class="topsite-time">${escapeHtml(s.time || s.duration || "")}</span>
      </div>`
    ).join("") || '<div class="empty-state">No sites tracked.</div>';

    // Timeline
    const timelineList = document.getElementById("timeline-list");
    timelineList.innerHTML = (ai.timeline || []).map(t =>
      `<div class="timeline-item">
        <span class="timeline-time">${escapeHtml(t.time || "")}</span>
        <span class="timeline-event">${escapeHtml(t.event || t.action || "")}</span>
      </div>`
    ).join("") || '<div class="empty-state">No timeline data.</div>';

    // Idle periods
    const idleList = document.getElementById("idle-list");
    idleList.innerHTML = (ai.idlePeriods || []).map(p =>
      `<div class="idle-item">
        <span>${escapeHtml(p.start || "")} → ${escapeHtml(p.end || "now")}</span>
        <span class="idle-duration">${escapeHtml(p.duration || "")}</span>
      </div>`
    ).join("") || '<div class="empty-state">No idle periods.</div>';

    // Strengths
    document.getElementById("strengths-list").innerHTML = (ai.strengths || []).map(s =>
      `<div class="bullet-item positive">✓ ${escapeHtml(s)}</div>`
    ).join("");

    // Concerns
    document.getElementById("concerns-list").innerHTML = (ai.concerns || []).map(c =>
      `<div class="bullet-item negative">⚠ ${escapeHtml(c)}</div>`
    ).join("");

    // Recommendations
    document.getElementById("recs-list").innerHTML = (ai.recommendations || []).map(r =>
      `<div class="bullet-item accent">→ ${escapeHtml(r)}</div>`
    ).join("");
  });
}

/* ============================================================
   ACTIVITY TAB
   ============================================================ */

function loadActivityLog() {
  chrome.runtime.sendMessage({ type: "GET_ACTION_LOG" }, (log) => {
    const list = document.getElementById("activity-log-list");
    if (!log || log.length === 0) {
      list.innerHTML = '<div class="empty-state">No actions logged yet.</div>';
      return;
    }
    list.innerHTML = log.slice(-50).reverse().map(a =>
      `<div class="activity-item">
        <span class="activity-time">${escapeHtml(a.time || "")}</span>
        <span class="activity-action">${escapeHtml(a.action || "")}</span>
        <span class="activity-domain">${escapeHtml(a.domain || "")}</span>
        ${a.label ? `<span class="activity-label">${escapeHtml(a.label)}</span>` : ""}
      </div>`
    ).join("");
  });
}
