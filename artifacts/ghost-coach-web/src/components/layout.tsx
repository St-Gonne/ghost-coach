import { useState } from "react";
import { useHealthCheck } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import {
  Activity,
  Calendar,
  LayoutDashboard,
  MapPin,
  Settings,
  Bug,
  CheckCircle2,
  User,
  Menu,
  X,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: health } = useHealthCheck();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Today", icon: LayoutDashboard },
    { href: "/week", label: "Week", icon: Calendar },
    { href: "/activities", label: "Activities", icon: Activity },
    { href: "/routines", label: "Routines", icon: CheckCircle2 },
    { href: "/locations", label: "Locations", icon: MapPin },
    { href: "/settings", label: "Settings", icon: Settings },
    { href: "/debug", label: "Debug", icon: Bug },
  ];

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:relative flex flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground",
          "h-full w-64 z-30 transition-transform duration-200 ease-in-out",
          "md:translate-x-0 md:flex-shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="p-5 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-accent flex items-center justify-center text-accent-foreground font-bold font-mono text-xs">
              GC
            </div>
            <h1 className="font-semibold tracking-widest uppercase text-sm text-sidebar-primary">
              Ghost Coach
            </h1>
          </div>
          <button
            onClick={closeSidebar}
            className="md:hidden p-1 rounded hover:bg-sidebar-accent/50 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active =
              location === item.href ||
              (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={closeSidebar}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-sidebar-foreground/70">
            <User className="w-4 h-4 flex-shrink-0" />
            Sharan
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b bg-background md:hidden flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 rounded hover:bg-muted transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold tracking-widest uppercase text-sm text-primary">
            Ghost Coach
          </span>
        </header>

        {/* Mock mode banner */}
        {health?.mockMode && (
          <div className="bg-amber-100 text-amber-900 px-4 py-2 text-xs font-semibold uppercase tracking-wider flex items-center justify-center border-b border-amber-200 flex-shrink-0">
            Mock Integrations Active
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
