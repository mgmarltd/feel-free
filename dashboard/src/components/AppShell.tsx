import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Avatar } from "./Avatar";
import { IconBell, IconChevronLeft, IconLogout, IconMenu, IconSearch } from "./icons";
import { useAuth } from "../lib/auth";

const COLLAPSE_KEY = "calmutopia_sidebar_collapsed";

export function AppShell({ children }: { children: ReactNode }) {
  const { email, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_KEY) === "1",
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r border-line bg-white px-3 py-5 transition-all duration-200 lg:sticky lg:top-0 lg:z-auto ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 w-64 ${collapsed ? "lg:w-[76px]" : "lg:w-64"}`}
      >
        <div className="flex items-center justify-between px-1">
          <Link to="/overview" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-card">
              <LogoMark />
            </span>
            <span
              className={`text-lg font-bold tracking-tight text-gray-900 ${collapsed ? "lg:hidden" : ""}`}
            >
              Calm<span className="text-brand-600">utopia</span>
            </span>
          </Link>
          <button
            className="ghost-icon hidden lg:grid"
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Toggle sidebar"
          >
            <IconChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        <Sidebar collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />

        <div className="mt-auto">
          <button
            onClick={signOut}
            className={`nav-item w-full ${collapsed ? "lg:justify-center lg:px-2" : ""}`}
          >
            <IconLogout className="h-5 w-5 text-gray-400" />
            <span className={collapsed ? "lg:hidden" : ""}>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-canvas/80 px-4 py-3 backdrop-blur sm:px-6">
          <button
            className="ghost-icon lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <IconMenu className="h-5 w-5" />
          </button>
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <form action="/users" className="contents">
              <input name="q" placeholder="Search users…" className="input pl-10" />
            </form>
          </div>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <button className="ghost-icon">
              <IconBell className="h-5 w-5" />
            </button>
            <div className="ml-1 flex items-center gap-2 rounded-xl border border-line bg-white py-1 pl-1 pr-1 sm:pr-2">
              <Avatar seed={email ?? "admin"} label={email ?? "admin"} size="sm" />
              <span className="hidden text-sm font-medium text-gray-700 sm:block">
                {email?.split("@")[0] ?? "admin"}
              </span>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h3l2 5 4-12 2 7h7" />
    </svg>
  );
}
