"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Rocket,
  Box,
  Play,
  Square,
  RotateCw,
  ScrollText,
  Trash,
  X,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  CONNECTION_KEY,
  type ServerConnection,
} from "@/lib/connection";

interface Container {
  id: string;
  name: string;
  image: string;
  status: "running" | "stopped";
  port?: string;
}

interface DeployFormData {
  image: string;
  name: string;
  port: string;
}

export default function ContainerPage() {
  const router = useRouter();
  const [connection, setConnection] = useState<ServerConnection | null>(null);
  const [containers, setContainers] = useState<Container[]>([]);
  const [formData, setFormData] = useState<DeployFormData>({
    image: "",
    name: "",
    port: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [logsContainer, setLogsContainer] = useState<Container | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(CONNECTION_KEY);
    if (!raw) {
      router.replace("/admin/connect");
      return;
    }
    try {
      const conn = JSON.parse(raw) as ServerConnection;
      setConnection(conn);
      fetchContainers(conn);
    } catch {
      sessionStorage.removeItem(CONNECTION_KEY);
      router.replace("/admin/connect");
    }
  }, [router]);

  const fetchContainers = async (conn: ServerConnection) => {
    setIsLoading(true);

    try {
      const { data } = await axios.post("/api/ssh/containers", conn);

      if (!data.success) {
        toast.error(data.message || "Failed to fetch containers.");
        setContainers([]);
      } else {
        setContainers(data.containers);
      }
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : "Failed to fetch containers from the server.";
      toast.error(message);
      setContainers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDeploy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!connection || !formData.image.trim() || !formData.name.trim()) return;

    setIsDeploying(true);

    try {
      const { data } = await axios.post("/api/ssh/execute", {
        ...connection,
        action: "deploy",
        image: formData.image.trim(),
        containerName: formData.name.trim(),
        containerPort: formData.port.trim() || undefined,
      });

      if (!data.success) {
        toast.error(data.message || "Failed to deploy container.");
      } else {
        toast.success(data.message || "Container deployed successfully.");
        setFormData({ image: "", name: "", port: "" });
        await fetchContainers(connection);
      }
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : "Failed to deploy container.";
      toast.error(message);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleAction = async (
    action: "stop" | "start" | "restart" | "remove",
    container: Container
  ) => {
    if (!connection) return;

    if (action === "remove") {
      const confirmed = window.confirm(
        `Are you sure you want to remove container "${container.name}"?`
      );
      if (!confirmed) return;
    }

    setActionLoading((prev) => ({ ...prev, [`${action}-${container.id}`]: true }));

    try {
      const { data } = await axios.post("/api/ssh/execute", {
        ...connection,
        action,
        containerId: container.id,
      });

      if (!data.success) {
        toast.error(data.message || `Failed to ${action} container.`);
      } else {
        toast.success(data.message || `Container ${action}ed successfully.`);
        await fetchContainers(connection);
      }
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : `Failed to ${action} container.`;
      toast.error(message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [`${action}-${container.id}`]: false }));
    }
  };

  const handleSeeLogs = async (container: Container) => {
    if (!connection) return;

    setLogsContainer(container);
    setIsLoadingLogs(true);
    setLogs([]);

    try {
      const { data } = await axios.post("/api/ssh/execute", {
        ...connection,
        action: "logs",
        containerId: container.id,
      });

      if (!data.success) {
        toast.error(data.message || "Failed to fetch logs.");
        setLogs([data.message || "Failed to fetch logs."]);
      } else {
        setLogs(
          data.output
            ? data.output.split("\n").filter((line: string) => line.trim())
            : ["No logs available."]
        );
      }
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : "Failed to fetch logs.";
      toast.error(message);
      setLogs([message]);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const closeLogsModal = () => {
    setLogsContainer(null);
    setLogs([]);
  };

  const runningCount = containers.filter((c) => c.status === "running").length;
  const stoppedCount = containers.filter((c) => c.status === "stopped").length;

  if (!connection) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Total Containers
          </p>
          <p className="mt-2 text-3xl font-bold">{containers.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
            Running
          </p>
          <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
            {runningCount}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Stopped
          </p>
          <p className="mt-2 text-3xl font-bold">{stoppedCount}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Deploy Container</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Target:{" "}
              <span className="font-medium text-foreground">
                {connection.name || connection.host}:{connection.port}
              </span>
            </p>
          </div>
        </div>

        <form onSubmit={handleDeploy} className="grid gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="image" className="text-sm font-medium">
              Docker Image
            </label>
            <input
              id="image"
              name="image"
              type="text"
              placeholder="e.g. nginx:latest"
              value={formData.image}
              onChange={handleChange}
              required
              className="rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-foreground focus:ring-4 focus:ring-foreground/10 dark:border-white/10 dark:bg-white/5"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium">
              Container Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="e.g. web-server"
              value={formData.name}
              onChange={handleChange}
              required
              className="rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-foreground focus:ring-4 focus:ring-foreground/10 dark:border-white/10 dark:bg-white/5"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="port" className="text-sm font-medium">
              Host Port
            </label>
            <input
              id="port"
              name="port"
              type="text"
              placeholder="e.g. 8080:80"
              value={formData.port}
              onChange={handleChange}
              className="rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-foreground focus:ring-4 focus:ring-foreground/10 dark:border-white/10 dark:bg-white/5"
            />
          </div>

          <div className="sm:col-span-4">
            <button
              type="submit"
              disabled={isDeploying}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-foreground px-6 text-sm font-semibold text-background shadow-lg shadow-foreground/20 outline-none transition-all hover:-translate-y-0.5 hover:bg-[#383838] hover:shadow-xl hover:shadow-foreground/25 focus:ring-4 focus:ring-foreground/20 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-[#ccc]"
            >
              {isDeploying ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              {isDeploying ? "Deploying..." : "Deploy"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
              <Box className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold">Containers</h2>
          </div>
          <button
            onClick={() => fetchContainers(connection)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {containers.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 py-12 text-center dark:border-white/10 dark:bg-white/5">
            <Box className="h-10 w-10 text-gray-400" />
            <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-300">
              No containers found
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Deploy a container or check the server connection.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Container</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Image</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Port</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {containers.map((container) => (
                  <tr
                    key={container.id}
                    className="transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[.03]"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold">{container.name}</div>
                      <div className="font-mono text-xs text-gray-500 dark:text-gray-400">
                        {container.id}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{container.image}</td>
                    <td className="px-4 py-3 font-mono text-xs">{container.port || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          container.status === "running"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            container.status === "running"
                              ? "bg-green-600 dark:bg-green-400"
                              : "bg-gray-500 dark:bg-gray-400"
                          }`}
                        />
                        {container.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {container.status === "running" ? (
                          <ActionButton
                            onClick={() => handleAction("stop", container)}
                            loading={actionLoading[`stop-${container.id}`]}
                            variant="danger"
                            icon={<Square className="h-3.5 w-3.5" />}
                            label="Stop"
                            loadingLabel="Stopping"
                          />
                        ) : (
                          <ActionButton
                            onClick={() => handleAction("start", container)}
                            loading={actionLoading[`start-${container.id}`]}
                            variant="success"
                            icon={<Play className="h-3.5 w-3.5" />}
                            label="Resume"
                            loadingLabel="Resuming"
                          />
                        )}
                        <ActionButton
                          onClick={() => handleAction("restart", container)}
                          loading={actionLoading[`restart-${container.id}`]}
                          variant="secondary"
                          icon={<RotateCw className="h-3.5 w-3.5" />}
                          label="Restart"
                          loadingLabel="Restarting"
                        />
                        <ActionButton
                          onClick={() => handleSeeLogs(container)}
                          variant="secondary"
                          icon={<ScrollText className="h-3.5 w-3.5" />}
                          label="Logs"
                        />
                        <ActionButton
                          onClick={() => handleAction("remove", container)}
                          loading={actionLoading[`remove-${container.id}`]}
                          variant="danger"
                          icon={<Trash className="h-3.5 w-3.5" />}
                          label="Remove"
                          loadingLabel="Removing"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {logsContainer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={closeLogsModal}
        >
          <div
            className="flex w-full max-w-3xl max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0f172a]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-white/10">
              <div>
                <h3 className="text-base font-bold">
                  Logs: {logsContainer.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {logsContainer.image}
                </p>
              </div>
              <button
                onClick={closeLogsModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-foreground dark:text-gray-400 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#0B1120] p-4 font-mono text-xs leading-relaxed text-green-400">
              {isLoadingLogs ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-600 border-t-gray-300" />
                  Loading logs...
                </div>
              ) : logs.length === 0 ? (
                <p className="text-gray-500">No logs available.</p>
              ) : (
                logs.map((line, index) => (
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

function ActionButton({
  onClick,
  loading,
  variant,
  icon,
  label,
  loadingLabel,
}: {
  onClick: () => void;
  loading?: boolean;
  variant: "danger" | "success" | "secondary";
  icon: React.ReactNode;
  label: string;
  loadingLabel?: string;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60";
  const styles = {
    danger:
      "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:-translate-y-0.5 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30",
    success:
      "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:-translate-y-0.5 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30",
    secondary:
      "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10",
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`${base} ${styles[variant]}`}
    >
      {loading ? (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon
      )}
      {loading && loadingLabel ? `${loadingLabel}...` : label}
    </button>
  );
}
