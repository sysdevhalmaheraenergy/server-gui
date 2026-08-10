"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Server, User, Lock, Plug } from "lucide-react";
import { toast } from "sonner";
import { useServer } from "@/components/providers/ServerProvider";
import {
  CONNECTION_KEY,
  type ServerConnection,
} from "@/lib/connection";

export default function ConnectServerPage() {
  const router = useRouter();
  const { servers, selectedServer, setSelectedServerId } = useServer();
  const [username, setUsername] = useState("root");
  const [password, setPassword] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const server = servers.find((s) => s.id === selectedServer?.id) ?? servers[0];

  const handleConnect = async () => {
    if (!server) return;

    if (!username.trim() || !password) {
      toast.error("Please enter both username and password.");
      return;
    }

    setIsConnecting(true);

    try {
      const { data } = await axios.post("/api/ssh/execute", {
        host: server.host,
        port: server.port,
        username: username.trim(),
        password,
        action: "test",
      });

      if (!data.success) {
        toast.error(data.message || "Failed to connect to the server.");
        setIsConnecting(false);
        return;
      }

      const connection: ServerConnection = {
        host: server.host,
        port: server.port,
        username: username.trim(),
        password,
        name: server.name,
      };

      sessionStorage.setItem(CONNECTION_KEY, JSON.stringify(connection));
      toast.success(data.message || "Connected successfully.");
      router.push("/admin/container");
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : "Failed to send connection request.";
      toast.error(message);
      setIsConnecting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-xl dark:border-white/10 dark:bg-[#0f172a]/70 sm:p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg">
            <Plug className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Connect to Server
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Select a server and enter SSH credentials to manage Docker containers.
          </p>
        </div>

        <div className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="server"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Server
            </label>
            <div className="relative">
              <Server className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                id="server"
                value={server?.id ?? ""}
                onChange={(e) => setSelectedServerId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-3.5 text-sm outline-none transition-all dark:border-white/10 dark:bg-white/5"
              >
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.host}:{s.port})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="username"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              SSH Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="username"
                type="text"
                placeholder="e.g. root"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-3.5 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-foreground focus:ring-4 focus:ring-foreground/10 dark:border-white/10 dark:bg-white/5"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              SSH Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="password"
                type="password"
                placeholder="Enter SSH password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-3.5 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-foreground focus:ring-4 focus:ring-foreground/10 dark:border-white/10 dark:bg-white/5"
              />
            </div>
          </div>

          <button
            onClick={handleConnect}
            disabled={isConnecting || !server}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-semibold text-background shadow-lg shadow-foreground/20 outline-none transition-all hover:-translate-y-0.5 hover:bg-[#383838] hover:shadow-xl hover:shadow-foreground/25 focus:ring-4 focus:ring-foreground/20 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-[#ccc]"
          >
            {isConnecting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
            ) : (
              <Plug className="h-4 w-4" />
            )}
            {isConnecting ? "Connecting..." : "Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}
