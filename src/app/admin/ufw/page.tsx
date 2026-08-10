"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Shield,
  RefreshCw,
  Plus,
  Trash,
  RotateCw,
  Terminal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { CONNECTION_KEY, type ServerConnection } from "@/lib/connection";

interface UfwRule {
  id: string;
  action: string;
  from: string;
  to: string;
  protocol: string;
  port: string;
}

export default function UfwPage() {
  const router = useRouter();
  const [connection, setConnection] = useState<ServerConnection | null>(null);
  const [rules, setRules] = useState<UfwRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [modal, setModal] = useState<{
    action: string;
    output: string;
    isLoading: boolean;
  } | null>(null);

  // Form states
  const [allowPort, setAllowPort] = useState("");
  const [allowProtocol, setAllowProtocol] = useState<"tcp" | "udp" | "">("");
  const [deleteRule, setDeleteRule] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem(CONNECTION_KEY);
    if (!raw) {
      router.replace("/admin/connect");
      return;
    }
    try {
      const conn = JSON.parse(raw) as ServerConnection;
      setConnection(conn);
      fetchUfwStatus(conn);
    } catch {
      sessionStorage.removeItem(CONNECTION_KEY);
      router.replace("/admin/connect");
    }
  }, [router]);

  const fetchUfwStatus = async (conn: ServerConnection) => {
    setIsLoading(true);

    try {
      const { data } = await axios.post("/api/ssh/ufw", {
        ...conn,
        action: "status",
      });

      if (!data.success) {
        toast.error(data.message || "Failed to fetch UFW status.");
      } else {
        const parsedRules = parseUfwOutput(data.output);
        setRules(parsedRules);
      }
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : "Failed to fetch UFW status.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const parseUfwOutput = (output: string): UfwRule[] => {
    const lines = output.split("\n").filter((line) => line.trim());
    const rules: UfwRule[] = [];

    for (const line of lines) {
      // Skip header lines
      if (line.includes("Status:") || line.includes("Logging:") || line.includes("Default")) {
        continue;
      }

      // Parse rule lines like: "[ 1] 22/tcp                     ALLOW IN    Anywhere"
      const match = line.match(/\[\s*(\d+)\]\s+(\S+)\s+(ALLOW|DENY)\s+(IN|OUT)\s+(.*)/);
      if (match) {
        const [, id, portProto, action, direction, from] = match;
        const [port, protocol] = portProto.split("/");
        rules.push({
          id,
          action,
          from: from?.trim() || "Anywhere",
          to: direction === "IN" ? "This server" : "Anywhere",
          protocol: protocol || "any",
          port: port || "",
        });
      }
    }

    return rules;
  };

  const handleAllow = async () => {
    if (!connection || !allowPort.trim()) return;

    setIsActionLoading(true);
    setModal({
      action: "allow",
      output: "",
      isLoading: true,
    });

    try {
      const { data } = await axios.post("/api/ssh/ufw", {
        ...connection,
        action: "allow",
        targetPort: allowPort.trim(),
        protocol: allowProtocol || undefined,
      });

      if (!data.success) {
        toast.error(data.message || "Failed to allow port.");
      } else {
        toast.success(data.message || "Port allowed successfully.");
        setAllowPort("");
        setAllowProtocol("");
        await fetchUfwStatus(connection);
      }

      setModal((prev) =>
        prev
          ? {
              ...prev,
              output: data.output || data.message || "No output.",
              isLoading: false,
            }
          : null
      );
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : "Failed to allow port.";
      toast.error(message);
      setModal((prev) =>
        prev ? { ...prev, output: message, isLoading: false } : null
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeny = async () => {
    if (!connection || !allowPort.trim()) return;

    setIsActionLoading(true);
    setModal({
      action: "deny",
      output: "",
      isLoading: true,
    });

    try {
      const { data } = await axios.post("/api/ssh/ufw", {
        ...connection,
        action: "deny",
        targetPort: allowPort.trim(),
        protocol: allowProtocol || undefined,
      });

      if (!data.success) {
        toast.error(data.message || "Failed to deny port.");
      } else {
        toast.success(data.message || "Port denied successfully.");
        setAllowPort("");
        setAllowProtocol("");
        await fetchUfwStatus(connection);
      }

      setModal((prev) =>
        prev
          ? {
              ...prev,
              output: data.output || data.message || "No output.",
              isLoading: false,
            }
          : null
      );
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : "Failed to deny port.";
      toast.error(message);
      setModal((prev) =>
        prev ? { ...prev, output: message, isLoading: false } : null
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!connection || !deleteRule.trim()) return;

    setIsActionLoading(true);
    setModal({
      action: "delete",
      output: "",
      isLoading: true,
    });

    try {
      const { data } = await axios.post("/api/ssh/ufw", {
        ...connection,
        action: "delete",
        rule: deleteRule.trim(),
      });

      if (!data.success) {
        toast.error(data.message || "Failed to delete rule.");
      } else {
        toast.success(data.message || "Rule deleted successfully.");
        setDeleteRule("");
        await fetchUfwStatus(connection);
      }

      setModal((prev) =>
        prev
          ? {
              ...prev,
              output: data.output || data.message || "No output.",
              isLoading: false,
            }
          : null
      );
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : "Failed to delete rule.";
      toast.error(message);
      setModal((prev) =>
        prev ? { ...prev, output: message, isLoading: false } : null
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReload = async () => {
    if (!connection) return;

    setIsActionLoading(true);
    setModal({
      action: "reload",
      output: "",
      isLoading: true,
    });

    try {
      const { data } = await axios.post("/api/ssh/ufw", {
        ...connection,
        action: "reload",
      });

      if (!data.success) {
        toast.error(data.message || "Failed to reload UFW.");
      } else {
        toast.success(data.message || "UFW reloaded successfully.");
        await fetchUfwStatus(connection);
      }

      setModal((prev) =>
        prev
          ? {
              ...prev,
              output: data.output || data.message || "No output.",
              isLoading: false,
            }
          : null
      );
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : "Failed to reload UFW.";
      toast.error(message);
      setModal((prev) =>
        prev ? { ...prev, output: message, isLoading: false } : null
      );
    } finally {
      setIsActionLoading(false);
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
      {/* Header */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">UFW Firewall</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage firewall rules and ports
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchUfwStatus(connection)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Actions */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Allow/Deny Port */}
          <div className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
            <h3 className="mb-3 text-sm font-semibold">Allow / Deny Port</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Port (e.g., 80, 443)"
                value={allowPort}
                onChange={(e) => setAllowPort(e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none dark:border-white/10 dark:bg-white/5"
              />
              <select
                value={allowProtocol}
                onChange={(e) => setAllowProtocol(e.target.value as "tcp" | "udp" | "")}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm outline-none dark:border-white/10 dark:bg-white/5"
              >
                <option value="">Any</option>
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
              </select>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleAllow}
                disabled={!allowPort.trim() || isActionLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-green-700 disabled:opacity-60"
              >
                <Plus className="h-3.5 w-3.5" />
                Allow
              </button>
              <button
                onClick={handleDeny}
                disabled={!allowPort.trim() || isActionLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-60"
              >
                <Plus className="h-3.5 w-3.5" />
                Deny
              </button>
            </div>
          </div>

          {/* Delete Rule */}
          <div className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
            <h3 className="mb-3 text-sm font-semibold">Delete Rule</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Rule number (e.g., 1)"
                value={deleteRule}
                onChange={(e) => setDeleteRule(e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none dark:border-white/10 dark:bg-white/5"
              />
              <button
                onClick={handleDelete}
                disabled={!deleteRule.trim() || isActionLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-60"
              >
                <Trash className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Reload Button */}
        <div className="mt-4">
          <button
            onClick={handleReload}
            disabled={isActionLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
          >
            <RotateCw className={`h-4 w-4 ${isActionLoading ? "animate-spin" : ""}`} />
            Reload UFW
          </button>
        </div>
      </section>

      {/* Rules Table */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="mb-4 flex items-center gap-2">
          <Terminal className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold">Current Rules</h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 py-8 text-center dark:border-white/10 dark:bg-white/5">
            <Shield className="h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-300">
              No rules found
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              UFW may be inactive or has no rules configured.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                    #
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                    Action
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                    Port
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                    Protocol
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                    From
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {rules.map((rule) => (
                  <tr
                    key={rule.id}
                    className="transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[.03]"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                      {rule.id}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          rule.action === "ALLOW"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        }`}
                      >
                        {rule.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                      {rule.port}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                        {rule.protocol}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                      {rule.from}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Output Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setModal(null)}
        >
          <div
            className="flex w-full max-w-3xl max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0f172a]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-gray-500" />
                <h3 className="text-base font-bold capitalize">
                  {modal.action}
                </h3>
              </div>
              <button
                onClick={() => setModal(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-foreground dark:text-gray-400 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#0B1120] p-4 font-mono text-xs leading-relaxed text-green-400">
              {modal.isLoading ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-600 border-t-gray-300" />
                  Running {modal.action}...
                </div>
              ) : (
                modal.output.split("\n").map((line, index) => (
                  <div key={index} className="py-0.5">
                    {line}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
