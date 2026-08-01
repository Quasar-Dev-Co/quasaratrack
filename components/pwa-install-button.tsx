"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, CheckCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Store the event globally so it survives re-renders
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [status, setStatus] = useState<"idle" | "installing" | "installed">(
    "idle"
  );
  const [isStandalone, setIsStandalone] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    // Check if already installed (running as PWA)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-ignore - iOS Safari
      window.navigator.standalone === true;
    setIsStandalone(standalone);

    // Check if browser supports PWA install
    const isChromeOrEdge = /Chrome|Edg/.test(navigator.userAgent);
    const isFirefox = /Firefox/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    setSupported(isChromeOrEdge || isFirefox || isSafari);

    const handler = (e: Event) => {
      e.preventDefault();
      globalDeferredPrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(globalDeferredPrompt);
    };

    const installedHandler = () => {
      setStatus("installed");
      setDeferredPrompt(null);
      globalDeferredPrompt = null;
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setStatus("installing");
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setStatus("installed");
      setDeferredPrompt(null);
      globalDeferredPrompt = null;
    } else {
      setStatus("idle");
    }
  };

  // Already running as installed app
  if (isStandalone) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
        style={{
          background: "rgba(52, 211, 153, 0.1)",
          border: "1px solid rgba(52, 211, 153, 0.25)",
          color: "#34d399",
        }}
      >
        <CheckCircle className="h-4 w-4 flex-shrink-0" />
        App is already installed and running in standalone mode
      </div>
    );
  }

  // Just installed
  if (status === "installed") {
    return (
      <div
        className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
        style={{
          background: "rgba(52, 211, 153, 0.1)",
          border: "1px solid rgba(52, 211, 153, 0.25)",
          color: "#34d399",
        }}
      >
        <CheckCircle className="h-4 w-4 flex-shrink-0" />
        App installed successfully! Find it on your home screen / desktop.
      </div>
    );
  }

  // Can install — the browser fired beforeinstallprompt
  if (deferredPrompt) {
    return (
      <Button
        onClick={handleInstall}
        disabled={status === "installing"}
        className="w-full"
        style={{
          background:
            "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #d946ef 100%)",
          boxShadow:
            "0 6px 18px rgba(124, 92, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
        }}
      >
        {status === "installing" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Installing...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Install App
          </>
        )}
      </Button>
    );
  }

  // Browser supports PWA but prompt hasn't fired yet
  // Show a manual install button that guides the user
  return (
    <div className="space-y-3">
      <Button
        onClick={() => {
          // Try to trigger install via custom button
          // Some browsers allow programmatic install
          if (deferredPrompt) {
            handleInstall();
          }
        }}
        disabled
        className="w-full opacity-50"
        style={{
          background:
            "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #d946ef 100%)",
        }}
      >
        <Download className="mr-2 h-4 w-4" />
        Install App
      </Button>
      <div
        className="rounded-xl px-4 py-3 text-xs"
        style={{
          background: "rgba(251, 191, 36, 0.08)",
          border: "1px solid rgba(251, 191, 36, 0.2)",
          color: "#fbbf24",
        }}
      >
        <p className="mb-1.5 font-semibold">How to install:</p>
        <ul className="space-y-1 pl-4">
          <li>
            <strong>Chrome / Edge (desktop):</strong> Click the install icon
            (⊕) in the address bar, or menu → &quot;Install Quasara Track&quot;
          </li>
          <li>
            <strong>Chrome (Android):</strong> Tap menu (⋮) → &quot;Install
            app&quot;
          </li>
          <li>
            <strong>Safari (iOS):</strong> Tap Share → &quot;Add to Home
            Screen&quot;
          </li>
        </ul>
        <p className="mt-2 text-muted-foreground">
          The install button will activate automatically once the browser
          detects the app is ready to install.
        </p>
      </div>
    </div>
  );
}
