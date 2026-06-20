import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Briefcase, Settings, TrendingUp } from "lucide-react";
import clsx from "clsx";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/portfolios", icon: Briefcase, label: "Portfolios" },
  { to: "/setup", icon: Settings, label: "Setup" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-bg-secondary border-r border-border flex flex-col">
        <div className="flex items-center gap-2 px-4 py-5 border-b border-border">
          <TrendingUp className="w-5 h-5 text-accent-purple" />
          <span className="font-semibold text-text-primary">Finance</span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                pathname === to || (to !== "/" && pathname.startsWith(to))
                  ? "bg-accent-purple/20 text-text-primary"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-border text-xs text-text-muted">
          finance.lancelotshih.com
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-bg-primary">
        {children}
      </main>
    </div>
  );
}
