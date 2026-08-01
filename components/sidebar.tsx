"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Activity,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/activity", label: "Activity Log", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  };

  const sidebarContent = (
    <>
      {/* Logo / Brand */}
      <div
        className="flex h-16 items-center gap-3 border-b px-6"
        style={{ borderColor: "rgba(124, 92, 255, 0.15)" }}
      >
        <Image
          src="/icon-48.png"
          alt="Quasara Track"
          width={36}
          height={36}
          className="rounded-lg"
          priority
        />
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight text-foreground">
            Quasara Track
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Productivity Suite
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Menu
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
              style={
                active
                  ? {
                      background:
                        "linear-gradient(135deg, rgba(124,92,255,0.15) 0%, rgba(217,70,239,0.12) 100%)",
                    }
                  : undefined
              }
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full"
                  style={{
                    background: "linear-gradient(180deg, #7c3aed, #d946ef)",
                  }}
                />
              )}
              <Icon
                className={cn(
                  "h-[18px] w-[18px] transition-colors",
                  active
                    ? "text-white"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer — user info + logout */}
      <div
        className="border-t p-4"
        style={{ borderColor: "rgba(124, 92, 255, 0.15)" }}
      >
        <div
          className="mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5"
          style={{
            background: "rgba(22, 28, 64, 0.55)",
            border: "1px solid rgba(124, 92, 255, 0.18)",
          }}
        >
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{
              background:
                "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #d946ef 100%)",
            }}
          >
            {session?.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
          </div>
          <div className="flex min-w-0 flex-col overflow-hidden">
            <span className="truncate text-xs font-semibold text-foreground">
              {session?.user?.name ?? "User"}
            </span>
            <span className="truncate text-[10px] text-muted-foreground">
              {session?.user?.email ?? ""}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:text-foreground"
          style={{ background: "transparent" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(248, 113, 113, 0.1)";
            e.currentTarget.style.color = "#f87171";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "";
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar — fixed width, hidden on mobile */}
      <aside
        className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col border-r md:flex"
        style={{
          background: "#0a0f24",
          borderColor: "rgba(124, 92, 255, 0.15)",
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div
        className="sticky top-0 z-40 flex h-14 items-center justify-between border-b px-4 md:hidden"
        style={{
          background: "#0a0f24",
          borderColor: "rgba(124, 92, 255, 0.15)",
        }}
      >
        <div className="flex items-center gap-2">
          <Image
            src="/icon-32.png"
            alt="Quasara Track"
            width={24}
            height={24}
            className="rounded-md"
          />
          <span className="text-sm font-bold tracking-tight text-foreground">
            Quasara Track
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
          style={{ background: "rgba(124, 92, 255, 0.1)" }}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          {/* Drawer */}
          <aside
            className="absolute left-0 top-0 flex h-screen w-72 flex-col border-r"
            style={{
              background: "#0a0f24",
              borderColor: "rgba(124, 92, 255, 0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
              style={{ background: "rgba(124, 92, 255, 0.1)" }}
            >
              <X className="h-4 w-4" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
