"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Settings, Server, Activity } from "lucide-react";
import { toast } from "sonner";
import {
  CONNECTION_KEY,
  type ServerConnection,
} from "@/lib/connection";

export default function ConfigurationPage() {
  const router = useRouter();
  const [connection, setConnection] = useState<ServerConnection | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(CONNECTION_KEY);
    if (!raw) {
      router.replace("/admin/connect");
      return;
    }
    try {
      setConnection(JSON.parse(raw));
    } catch {
      sessionStorage.removeItem(CONNECTION_KEY);
      router.replace("/admin/connect");
    }
  }, [router]);

  const handleTestConnection = async () => {
    if (!connection) return;

    setIsTesting(true);

    try {
      const { data } = await axios.post("/api/ssh/execute", {
        ...connection,
        action: "test",
      });

      if (data.success) {
        toast.success(data.message || "Connection successful.");
      } else {
        toast.error(data.message || "Connection failed.");
      }
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : "Failed to send test connection request.";
      toast.error(message);
    } finally {
      setIsTesting(false);
    }
  };

  if (!connection) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Server Configuration</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Active SSH connection details.
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="server-name"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Server Name
            </label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="server-name"
                type="text"
                value={connection.name || connection.host}
                readOnly
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-3.5 text-sm outline-none transition-all dark:border-white/10 dark:bg-white/5"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="server-host"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Host
            </label>
            <input
              id="server-host"
              type="text"
              value={connection.host}
              readOnly
              className="rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm outline-none transition-all dark:border-white/10 dark:bg-white/5"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="server-port"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Port
            </label>
            <input
              id="server-port"
              type="text"
              value={connection.port}
              readOnly
              className="rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm outline-none transition-all dark:border-white/10 dark:bg-white/5"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Connection Test</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Verify SSH connectivity to the active server.
            </p>
          </div>
        </div>

        <button
          onClick={handleTestConnection}
          disabled={isTesting}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-foreground px-6 text-sm font-semibold text-background shadow-lg shadow-foreground/20 outline-none transition-all hover:-translate-y-0.5 hover:bg-[#383838] hover:shadow-xl hover:shadow-foreground/25 focus:ring-4 focus:ring-foreground/20 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-[#ccc]"
        >
          {isTesting ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
          ) : (
            <Activity className="h-4 w-4" />
          )}
          {isTesting ? "Testing..." : "Test Connection"}
        </button>
      </section>
    </div>
  );
}
