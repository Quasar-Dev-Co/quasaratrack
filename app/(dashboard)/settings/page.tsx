"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Database,
  Bot,
  Save,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PWAInstallButton } from "@/components/pwa-install-button";

export default function SettingsPage() {
  const { data: session } = useSession();

  // AI settings state
  const [aiApiKey, setAiApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Load settings on mount
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.hasKey) {
          setHasKey(true);
          setAiApiKey(data.aiApiKey); // masked
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveSettings = async () => {
    setSettingsMessage(null);
    setSavingSettings(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiApiKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSettingsMessage({ type: "error", text: data.error || "Failed to save" });
      } else {
        setSettingsMessage({ type: "success", text: "Settings saved successfully!" });
        setHasKey(true);
        // Refresh masked value
        fetch("/api/settings")
          .then((r) => r.json())
          .then((d) => {
            if (d.hasKey) setAiApiKey(d.aiApiKey);
          })
          .catch(() => {});
      }
    } catch {
      setSettingsMessage({ type: "error", text: "Network error" });
    }
    setSavingSettings(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({
        type: "error",
        text: "New password must be at least 6 characters long",
      });
      return;
    }

    setChangingPassword(true);

    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordMessage({ type: "error", text: data.error || "Failed to change password" });
      } else {
        setPasswordMessage({ type: "success", text: "Password changed successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPasswordMessage({ type: "error", text: "Network error. Please try again." });
    }

    setChangingPassword(false);
  };

  const inputStyle: React.CSSProperties = {
    background: "rgba(10, 15, 36, 0.6)",
    border: "1px solid rgba(124, 92, 255, 0.15)",
    color: "#e8eaf6",
  };

  const cardStyle: React.CSSProperties = {
    background: "rgba(22, 28, 64, 0.55)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(124, 92, 255, 0.18)",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure AI integration, idle threshold, and account security
        </p>
      </div>

      {/* Account / Password section */}
      <div
        className="animate-fade-in-up overflow-hidden rounded-2xl"
        style={cardStyle}
      >
        <div
          className="flex items-center gap-3 border-b p-6"
          style={{ borderColor: "rgba(124, 92, 255, 0.12)" }}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
              boxShadow: "0 6px 18px rgba(124, 92, 255, 0.25)",
            }}
          >
            <Lock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Account Security
            </h2>
            <p className="text-sm text-muted-foreground">
              Change your password · Signed in as{" "}
              <span style={{ color: "#c084fc" }}>
                {session?.user?.email}
              </span>
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-5 p-6">
          {passwordMessage && (
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
              style={
                passwordMessage.type === "success"
                  ? {
                      background: "rgba(52, 211, 153, 0.1)",
                      border: "1px solid rgba(52, 211, 153, 0.25)",
                      color: "#34d399",
                    }
                  : {
                      background: "rgba(248, 113, 113, 0.1)",
                      border: "1px solid rgba(248, 113, 113, 0.25)",
                      color: "#f87171",
                    }
              }
            >
              {passwordMessage.type === "success" ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              )}
              {passwordMessage.text}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-3">
            {/* Current password */}
            <div>
              <label
                className="mb-2 block text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#a4adcf" }}
              >
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl py-2.5 pl-4 pr-10 text-sm outline-none transition-all placeholder:text-[#6b7299]"
                  style={inputStyle}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "rgba(124, 92, 255, 0.5)")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = "rgba(124, 92, 255, 0.15)")
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#6b7299" }}
                >
                  {showCurrent ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label
                className="mb-2 block text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#a4adcf" }}
              >
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl py-2.5 pl-4 pr-10 text-sm outline-none transition-all placeholder:text-[#6b7299]"
                  style={inputStyle}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "rgba(124, 92, 255, 0.5)")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = "rgba(124, 92, 255, 0.15)")
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#6b7299" }}
                >
                  {showNew ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label
                className="mb-2 block text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#a4adcf" }}
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl py-2.5 pl-4 pr-10 text-sm outline-none transition-all placeholder:text-[#6b7299]"
                  style={inputStyle}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "rgba(124, 92, 255, 0.5)")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = "rgba(124, 92, 255, 0.15)")
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#6b7299" }}
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={changingPassword}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60"
              style={{
                background:
                  "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #d946ef 100%)",
                boxShadow:
                  "0 6px 18px rgba(124, 92, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
            >
              {changingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Change Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* PWA Install */}
      <div className="animate-fade-in-up overflow-hidden rounded-2xl" style={cardStyle}>
        <div
          className="flex items-center gap-3 border-b p-6"
          style={{ borderColor: "rgba(124, 92, 255, 0.12)" }}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%)",
              boxShadow: "0 6px 18px rgba(6, 182, 212, 0.25)",
            }}
          >
            <Download className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Install App
            </h2>
            <p className="text-sm text-muted-foreground">
              Install Quasara Track as a desktop or mobile app for quick access
            </p>
          </div>
        </div>
        <div className="p-6">
          <PWAInstallButton />
        </div>
      </div>

      {/* Firebase Configuration */}
      <div className="animate-fade-in-up overflow-hidden rounded-2xl" style={cardStyle}>
        <div
          className="flex items-center gap-3 border-b p-6"
          style={{ borderColor: "rgba(124, 92, 255, 0.12)" }}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)",
              boxShadow: "0 6px 18px rgba(96, 165, 250, 0.25)",
            }}
          >
            <Database className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Firebase Configuration
            </h2>
            <p className="text-sm text-muted-foreground">
              Realtime Database credentials
            </p>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-2">
            <Badge variant="success">Connected</Badge>
            <span className="text-xs text-muted-foreground">
              Configured via .env.local as NEXT_PUBLIC_FIREBASE_*
            </span>
          </div>
        </div>
      </div>

      {/* AI Configuration */}
      <div className="animate-fade-in-up overflow-hidden rounded-2xl" style={cardStyle}>
        <div
          className="flex items-center gap-3 border-b p-6"
          style={{ borderColor: "rgba(124, 92, 255, 0.12)" }}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
              boxShadow: "0 6px 18px rgba(251, 191, 36, 0.25)",
            }}
          >
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              AI Configuration
            </h2>
            <p className="text-sm text-muted-foreground">
              OpenAI API key for generating activity reports (GPT-5.4-nano)
            </p>
          </div>
        </div>

        <div className="space-y-4 p-6">
          {/* Status message */}
          {settingsMessage && (
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
              style={
                settingsMessage.type === "success"
                  ? {
                      background: "rgba(52, 211, 153, 0.1)",
                      border: "1px solid rgba(52, 211, 153, 0.25)",
                      color: "#34d399",
                    }
                  : {
                      background: "rgba(248, 113, 113, 0.1)",
                      border: "1px solid rgba(248, 113, 113, 0.25)",
                      color: "#f87171",
                    }
              }
            >
              {settingsMessage.type === "success" ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              )}
              {settingsMessage.text}
            </div>
          )}

          {/* Key status badge */}
          <div className="flex items-center gap-2">
            <Badge variant={hasKey ? "success" : "secondary"}>
              {hasKey ? "Key Saved" : "No Key Set"}
            </Badge>
            {hasKey && (
              <span className="text-xs text-muted-foreground">
                Key is stored securely in Firebase
              </span>
            )}
          </div>

          {/* API Key input */}
          <div>
            <label
              className="mb-2 block text-xs font-semibold uppercase tracking-wider"
              style={{ color: "#a4adcf" }}
            >
              OpenAI API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={aiApiKey}
                onChange={(e) => setAiApiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="w-full rounded-xl py-2.5 pl-4 pr-10 text-sm outline-none transition-all placeholder:text-[#6b7299]"
                style={inputStyle}
                onFocus={(e) =>
                  (e.target.style.borderColor = "rgba(124, 92, 255, 0.5)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "rgba(124, 92, 255, 0.15)")
                }
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "#6b7299" }}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {hasKey
                ? "Key is saved. Enter a new key to replace it."
                : "Get your API key from platform.openai.com/api-keys"}
            </p>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="flex items-center gap-2"
              style={{
                background:
                  "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #d946ef 100%)",
                boxShadow:
                  "0 6px 18px rgba(124, 92, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
            >
              {savingSettings ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
