(() => {
  // Prevent double-injection (manifest + chrome.scripting both inject)
  if (window.__quasaraTrackLoaded) {
    console.log("[Quasara Track] Already loaded on this page, skipping");
    return;
  }
  window.__quasaraTrackLoaded = true;
  console.log("[Quasara Track] Content script loaded on", location.href);
  let lastActivityTime = Date.now();
  let keystrokeCount = 0;
  let copyCount = 0;
  let pasteCount = 0;
  let clickCount = 0;
  let reportingInterval = null;
  let actionLog = [];
  let extensionValid = true;

  self.addEventListener("unhandledrejection", (e) => {
    if (e.reason && e.reason.message && e.reason.message.includes("invalidated")) {
      extensionValid = false;
      e.preventDefault();
    }
  });

  function safeSendMessage(msg, callback) {
    if (!extensionValid) return;
    try {
      if (!chrome.runtime?.id) {
        extensionValid = false;
        return;
      }
      const p = chrome.runtime.sendMessage(msg);
      if (p && typeof p.then === "function") {
        p.then(
          (response) => { if (callback) callback(response); },
          (err) => {
            if (err && err.message && err.message.includes("invalidated")) {
              extensionValid = false;
            }
            if (callback) callback(null);
          }
        );
      } else if (callback) {
        try { callback(undefined); } catch {}
      }
    } catch (e) {
      if (e && e.message && e.message.includes("invalidated")) {
        extensionValid = false;
      }
    }
  }

  function reportActivity() {
    lastActivityTime = Date.now();
    safeSendMessage({
      type: "ACTIVITY",
      timestamp: lastActivityTime
    });
  }

  function getTimestamp() {
    return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function truncate(str, max) {
    if (!str) return "";
    str = str.trim().replace(/\s+/g, " ");
    return str.length > max ? str.substring(0, max) + "..." : str;
  }

  function getClickableInfo(e) {
    const target = e.target;
    if (!target) return null;

    let info = {
      tag: target.tagName ? target.tagName.toLowerCase() : "unknown",
      text: "",
      href: "",
      type: "",
      id: "",
      className: "",
      role: ""
    };

    if (target.tagName === "A") {
      info.href = target.href || "";
    }
    if (target.tagName === "INPUT" || target.tagName === "BUTTON") {
      info.type = target.type || "";
    }

    info.text = truncate(target.innerText || target.textContent || target.value || target.title || target.alt || "", 80);
    info.id = target.id || "";
    info.className = truncate(target.className, 60);
    info.role = target.getAttribute("role") || "";

    let label = "";
    if (target.tagName === "BUTTON" || info.role === "button") {
      label = info.text || info.id || "button";
    } else if (target.tagName === "A") {
      label = info.text || info.href || "link";
    } else if (target.tagName === "INPUT") {
      label = info.type === "submit" ? "Submit" : info.type || "input";
    } else if (info.role === "tab") {
      label = info.text || "tab";
    } else if (target.tagName === "SELECT") {
      label = "dropdown: " + truncate(target.value || "", 40);
    } else if (info.text) {
      label = info.text;
    } else {
      return null;
    }

    return { info, label };
  }

  function logAction(actionType, details) {
    const entry = {
      time: getTimestamp(),
      action: actionType,
      ...details
    };
    actionLog.push(entry);
    if (actionLog.length > 200) {
      actionLog = actionLog.slice(-200);
    }
  }

  function reportCounts() {
    if (keystrokeCount > 0 || clickCount > 0 || copyCount > 0 || pasteCount > 0 || actionLog.length > 0) {
      console.log("[Quasara Track] Sending counts: keys=", keystrokeCount, "clicks=", clickCount, "copies=", copyCount, "pastes=", pasteCount, "actions=", actionLog.length);
    }
    safeSendMessage({
      type: "COUNTS",
      keystrokes: keystrokeCount,
      copies: copyCount,
      pastes: pasteCount,
      clicks: clickCount,
      actionLog: actionLog,
      timestamp: Date.now()
    });
    keystrokeCount = 0;
    copyCount = 0;
    pasteCount = 0;
    clickCount = 0;
    actionLog = [];
  }

  document.addEventListener("mousemove", reportActivity, { passive: true });

  document.addEventListener("keydown", (e) => {
    reportActivity();
    keystrokeCount++;
    console.log("[Quasara Track] Keystroke detected, count:", keystrokeCount);
    if (e.key === "Enter") {
      const target = e.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        const inputLabel = truncate(target.placeholder || target.id || target.getAttribute("aria-label") || target.name || "input", 50);
        logAction("ENTER_KEY", { element: target.tagName.toLowerCase(), label: inputLabel });
      }
    }
    // Send counts immediately if we've accumulated 5+ keystrokes
    if (keystrokeCount >= 5) {
      reportCounts();
    }
  }, true);

  document.addEventListener("scroll", reportActivity, { passive: true });

  document.addEventListener("click", (e) => {
    reportActivity();
    clickCount++;
    console.log("[Quasara Track] Click detected, count:", clickCount);
    const result = getClickableInfo(e);
    if (result) {
      const { info, label } = result;
      if (info.tag === "a") {
        logAction("LINK_CLICK", { element: "link", label: label, href: truncate(info.href, 120) });
      } else if (info.tag === "button" || info.role === "button") {
        logAction("BUTTON_CLICK", { element: "button", label: label });
      } else if (info.tag === "input" && (info.type === "submit" || info.type === "button")) {
        logAction("BUTTON_CLICK", { element: "input:" + info.type, label: label });
      } else if (info.role === "tab") {
        logAction("TAB_CLICK", { element: "tab", label: label });
      } else if (info.tag === "select") {
        logAction("DROPDOWN_CHANGE", { element: "dropdown", label: label });
      } else if (info.role === "menuitem" || info.role === "option") {
        logAction("UI_CLICK", { element: info.role, label: label });
      }
    }
  }, true);

  document.addEventListener("copy", (e) => {
    copyCount++;
    reportActivity();
    logAction("COPY", { element: "clipboard", label: "copied text" });
    console.log("[Quasara Track] Copy detected, count:", copyCount);
    reportCounts();
  }, true);

  document.addEventListener("paste", (e) => {
    pasteCount++;
    reportActivity();
    logAction("PASTE", { element: "clipboard", label: "pasted text" });
    console.log("[Quasara Track] Paste detected, count:", pasteCount);
    reportCounts();
  }, true);

  document.addEventListener("cut", (e) => {
    reportActivity();
    logAction("CUT", { element: "clipboard", label: "cut text" });
    console.log("[Quasara Track] Cut detected");
    reportCounts();
  }, true);

  document.addEventListener("submit", (e) => {
    const form = e.target;
    const formId = form.id || form.getAttribute("name") || form.getAttribute("aria-label") || "form";
    const action = form.getAttribute("action") || "";
    logAction("FORM_SUBMIT", { element: "form", label: truncate(formId, 50), action: truncate(action, 80) });
    reportActivity();
  }, { passive: true });

  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      logAction("NAVIGATE", { element: "url", label: "page navigation", from: truncate(lastUrl, 100), to: truncate(location.href, 100) });
      lastUrl = location.href;
    }
  });
  urlObserver.observe(document.body, { childList: true, subtree: true });

  if (reportingInterval) clearInterval(reportingInterval);
  reportingInterval = setInterval(() => {
    if (!extensionValid) {
      clearInterval(reportingInterval);
      reportingInterval = null;
      return;
    }
    reportCounts();
  }, 5000);

  window.addEventListener("beforeunload", () => {
    reportCounts();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      reportCounts();
    } else {
      reportActivity();
    }
  });

  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (!extensionValid) {
        try { sendResponse({ alive: false }); } catch {}
        return true;
      }
      try {
        if (msg.type === "PING") {
          sendResponse({
            alive: true,
            lastActivity: lastActivityTime,
            keystrokes: keystrokeCount,
            copies: copyCount,
            pastes: pasteCount,
            clicks: clickCount,
            actionLog: actionLog
          });
        } else if (msg.type === "FLUSH_CONTENT") {
          reportCounts();
          sendResponse({ success: true });
        }
      } catch (e) {
        if (e && e.message && e.message.includes("invalidated")) {
          extensionValid = false;
        }
      }
      return true;
    });
  }
})();
