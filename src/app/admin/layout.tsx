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
} from "lucide-react";
import { ServerProvider } from "@/components/providers/ServerProvider";
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
    <div className="min-h-screen bg-gray-50/50 text-foreground dark:bg-background font-[family-name:var(--font-geist-sans)]">
      <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-[#0f172a]/60">
        <div className="mx-auto flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href={isConnectPage ? "/admin/connect" : "/admin/container"}
              className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.06]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background shadow-md">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <span className="hidden text-lg font-bold tracking-tight sm:inline">
                Devops Panel
              </span>
            </Link>
          </div>

          {!isConnectPage && (
            <nav className="hidden items-center rounded-full border border-gray-200 bg-gray-100/50 p-1 dark:border-white/10 dark:bg-white/5 sm:flex">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-white text-foreground shadow-sm dark:bg-white/10"
                        : "text-gray-600 hover:text-foreground dark:text-gray-400 dark:hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="flex items-center gap-3">
            {connection && !isConnectPage && (
              <div className="hidden items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 dark:border-green-900/50 dark:bg-green-900/20 sm:flex">
                <div className="h-2 w-2 rounded-full bg-green-600 dark:bg-green-400" />
                <span className="max-w-[10rem] truncate text-sm font-medium text-green-800 dark:text-green-300">
                  {connection.name || connection.host}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                {email.charAt(0).toUpperCase()}
              </div>
              <span className="hidden max-w-[6rem] truncate text-sm font-medium sm:inline">
                {email}
              </span>
            </div>

            {connection && !isConnectPage && (
              <button
                onClick={handleDisconnect}
                className="group flex items-center gap-2 rounded-full border border-gray-200 bg-gray-100/50 px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:border-amber-900/50 dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
              >
                <Unplug className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                <span className="hidden lg:inline">Disconnect</span>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="group flex items-center gap-2 rounded-full border border-gray-200 bg-gray-100/50 px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:border-red-900/50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            >
              <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden lg:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {!isConnectPage && (
        <nav className="border-b border-gray-200 bg-white px-4 py-2 dark:border-white/10 dark:bg-[#0f172a]/40 sm:hidden">
          <div className="mx-auto flex max-w-7xl gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-foreground text-background shadow-sm"
                      : "text-gray-600 hover:bg-black/[.05] dark:text-gray-400 dark:hover:bg-white/[.06]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
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
