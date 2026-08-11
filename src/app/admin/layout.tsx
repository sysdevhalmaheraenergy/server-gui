"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutGrid,
  Server,
  Settings,
  Activity,
  GitBranch,
  LogOut,
  Unplug,
  Shield,
  History,
} from "lucide-react";
import { ServerProvider } from "@/components/providers/ServerProvider";
import { NavigationProgress } from "@/components/NavigationProgress";
import {
  CONNECTION_KEY,
  type ServerConnection,
} from "@/lib/connection";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [connection, setConnection] = useState<ServerConnection | null>(null);

  useEffect(() => {
    const rawSession = sessionStorage.getItem("server-monitoring-session");
    if (!rawSession) {
      router.replace("/");
      return;
    }
    try {
      const session = JSON.parse(rawSession) as { email: string };
      setEmail(session.email);
    } catch {
      sessionStorage.removeItem("server-monitoring-session");
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (pathname === "/admin/connect") return;

    const rawConnection = sessionStorage.getItem(CONNECTION_KEY);
    if (!rawConnection) {
      router.replace("/admin/connect");
      return;
    }
    try {
      setConnection(JSON.parse(rawConnection));
    } catch {
      sessionStorage.removeItem(CONNECTION_KEY);
      router.replace("/admin/connect");
    }
  }, [pathname, router]);

  const handleLogout = () => {
    sessionStorage.removeItem("server-monitoring-session");
    sessionStorage.removeItem(CONNECTION_KEY);
    router.replace("/");
  };

  const handleDisconnect = () => {
    sessionStorage.removeItem(CONNECTION_KEY);
    router.replace("/admin/connect");
  };

  const navItems = [
    {
      href: "/admin/container",
      label: "Container",
      icon: Server,
    },
    {
      href: "/admin/performance",
      label: "Performance",
      icon: Activity,
    },
    {
      href: "/admin/repository",
      label: "Repository",
      icon: GitBranch,
    },
    {
      href: "/admin/ufw",
      label: "UFW",
      icon: Shield,
    },
    {
      href: "/admin/login-history",
      label: "Login History",
      icon: History,
    },
    {
      href: "/admin/configuration",
      label: "Configuration",
      icon: Settings,
    },
  ];

  const isConnectPage = pathname === "/admin/connect";

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50/50 text-foreground dark:bg-background font-[family-name:var(--font-geist-sans)]">
      <NavigationProgress />

      {/* Sidebar */}
      {!isConnectPage && (
        <aside className="fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-gray-200 bg-white dark:border-white/10 dark:bg-[#0f172a]">
          <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-4 dark:border-white/10">
            <Link
              href="/admin/container"
              className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.06]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background shadow-md">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold tracking-tight">
                Devops Panel
              </span>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto p-3">
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-foreground text-background shadow-sm"
                        : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-gray-200 p-3 dark:border-white/10">
            {connection && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 dark:border-green-900/50 dark:bg-green-900/20">
                <div className="h-2 w-2 rounded-full bg-green-600 dark:bg-green-400" />
                <span className="truncate text-sm font-medium text-green-800 dark:text-green-300">
                  {connection.name || connection.host}
                </span>
              </div>
            )}

            <div className="mb-3 flex items-center gap-3 px-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
                {email.charAt(0).toUpperCase()}
              </div>
              <span className="truncate text-sm font-medium">{email}</span>
            </div>

            {connection && (
              <button
                onClick={handleDisconnect}
                className="group mb-2 flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-gray-100/50 px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:border-amber-900/50 dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
              >
                <Unplug className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                Disconnect
              </button>
            )}

            <button
              onClick={handleLogout}
              className="group flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-gray-100/50 px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:border-red-900/50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            >
              <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Logout
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${!isConnectPage ? "ml-64" : ""}`}>
        {!isConnectPage && (
          <header className="sticky top-0 z-30 flex h-16 items-center border-b border-gray-200/80 bg-white/80 px-6 backdrop-blur-md dark:border-white/10 dark:bg-[#0f172a]/60">
            <h1 className="text-lg font-semibold">
              {navItems.find((item) => item.href === pathname)?.label || "Admin"}
            </h1>
          </header>
        )}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ServerProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </ServerProvider>
  );
}
