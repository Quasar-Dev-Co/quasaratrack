"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      setLoading(false);

      if (result?.error) {
        setError("Invalid email or password");
      } else if (result?.ok) {
        // Successful login — redirect to dashboard
        window.location.href = callbackUrl;
      } else {
        // result is undefined or null — something went wrong
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      setLoading(false);
      setError("Network error. Please try again.");
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo + title */}
      <div className="mb-8 text-center">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #d946ef 100%)",
            boxShadow: "0 8px 24px rgba(124, 92, 255, 0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
        >
          <Image
            src="/icon-48.png"
            alt="Quasara Track"
            width={36}
            height={36}
            className="rounded-lg"
            priority
          />
        </div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{
            background: "linear-gradient(90deg, #ffffff, #c084fc)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Quasara Track
        </h1>
        <p className="mt-2 text-sm" style={{ color: "#a4adcf" }}>
          Sign in to your dashboard
        </p>
      </div>

      {/* Login card */}
      <div
        className="rounded-2xl p-8"
        style={{
          background: "rgba(22, 28, 64, 0.55)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(124, 92, 255, 0.18)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Error message */}
          {error && (
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
              style={{
                background: "rgba(248, 113, 113, 0.1)",
                border: "1px solid rgba(248, 113, 113, 0.25)",
                color: "#f87171",
              }}
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Email field */}
          <div>
            <label
              className="mb-2 block text-xs font-semibold uppercase tracking-wider"
              style={{ color: "#a4adcf" }}
            >
              Email
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3.5 top-1/2 h-[18px] w-[18px -translate-y-1/2"
                style={{ color: "#6b7299" }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@quasara.com"
                required
                autoFocus
                className="w-full rounded-xl py-3 pl-11 pr-4 text-sm text-white outline-none transition-all placeholder:text-[#6b7299]"
                style={{
                  background: "rgba(10, 15, 36, 0.6)",
                  border: "1px solid rgba(124, 92, 255, 0.15)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(124, 92, 255, 0.5)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(124, 92, 255, 0.15)";
                }}
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label
              className="mb-2 block text-xs font-semibold uppercase tracking-wider"
              style={{ color: "#a4adcf" }}
            >
              Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2"
                style={{ color: "#6b7299" }}
              />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl py-3 pl-11 pr-11 text-sm text-white outline-none transition-all placeholder:text-[#6b7299]"
                style={{
                  background: "rgba(10, 15, 36, 0.6)",
                  border: "1px solid rgba(124, 92, 255, 0.15)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(124, 92, 255, 0.5)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(124, 92, 255, 0.15)";
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "#6b7299" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#c084fc")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7299")}
              >
                {showPassword ? (
                  <EyeOff className="h-[18px] w-[18px]" />
                ) : (
                  <Eye className="h-[18px] w-[18px]" />
                )}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #d946ef 100%)",
              boxShadow: "0 6px 18px rgba(124, 92, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
            onMouseEnter={(e) => {
              if (!loading)
                e.currentTarget.style.boxShadow =
                  "0 8px 24px rgba(124, 92, 255, 0.45), inset 0 1px 0 rgba(255,255,255,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow =
                "0 6px 18px rgba(124, 92, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)";
            }}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="mt-6 text-center text-xs" style={{ color: "#6b7299" }}>
        Quasara Track · Employee Productivity Dashboard
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{
        background:
          "radial-gradient(900px 500px at 100% -10%, rgba(124, 92, 255, 0.18), transparent 60%), radial-gradient(700px 400px at -10% 110%, rgba(217, 70, 239, 0.14), transparent 60%), linear-gradient(180deg, #0a0f24 0%, #050816 100%)",
      }}
    >
      <Suspense fallback={<div className="text-white">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
