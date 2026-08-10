"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  GitBranch,
  FolderGit,
  RefreshCw,
  Play,
  Download,
  X,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import {
  CONNECTION_KEY,
  type ServerConnection,
} from "@/lib/connection";

interface Repository {
  name: string;
  path: string;
  isGit: boolean;
  branch: string;
}

interface LogModal {
  repo: Repository;
  action: "status" | "pull" | "build" | "clone";
  output: string;
  isLoading: boolean;
}

const BUILD_COMMANDS = [
  { label: "npm run build", value: "npm run build" },
  { label: "bun run build", value: "bun run build" },
  { label: "composer install", value: "composer install --no-dev" },
  { label: "docker compose up -d --build", value: "sudo docker compose up -d --build" },
  { label: "docker compose down", value: "sudo docker compose down" },
];

export default function RepositoryPage() {
  const router = useRouter();
  const [connection, setConnection] = useState<ServerConnection | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState<LogModal | null>(null);
  const [buildCommand, setBuildCommand] = useState(BUILD_COMMANDS[0].value);
  const [cloneUrl, setCloneUrl] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem(CONNECTION_KEY);
    if (!raw) {
      router.replace("/admin/connect");
      return;
    }
    try {
      const conn = JSON.parse(raw) as ServerConnection;
      setConnection(conn);
      fetchRepositories(conn);
    } catch {
      sessionStorage.removeItem(CONNECTION_KEY);
      router.replace("/admin/connect");
    }
  }, [router]);

  const fetchRepositories = async (conn: ServerConnection) => {
    setIsLoading(true);

    try {
      const { data } = await axios.post("/api/ssh/repository", conn);

      if (!data.success) {
        toast.error(data.message || "Failed to fetch repositories.");
      } else {
        setRepositories(data.repositories);
      }
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : "Failed to fetch repositories.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClone = async () => {
    if (!connection || !cloneUrl.trim()) return;

    const dummyRepo: Repository = { name: cloneUrl.split("/").pop()?.replace(".git", "") || "repo", path: "/var/www", isGit: true, branch: "-" };
    
    setModal({
      repo: dummyRepo,
      action: "clone",
      output: `$ git clone ${cloneUrl}\n`,
      isLoading: true,
    });

    try {
      const { data } = await axios.post("/api/ssh/repository", {
        ...connection,
        action: "clone",
        url: cloneUrl,
      });

      if (!data.success) {
        toast.error(data.message || "Failed to clone repository.");
      } else {
        toast.success("Repository cloned successfully.");
        setCloneUrl("");
        await fetchRepositories(connection);
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
        : "Failed to clone repository.";
      toast.error(message);
      setModal((prev) =>
        prev ? { ...prev, output: message, isLoading: false } : null
      );
    }
  };

  const runAction = async (
    repo: Repository,
    action: "status" | "pull" | "build" | "clone",
    command?: string
  ) => {
    if (!connection) return;

    setModal({
      repo,
      action,
      output: action === "build" ? `$ ${command}\n` : "",
      isLoading: true,
    });

    try {
      const { data } = await axios.post("/api/ssh/repository", {
        ...connection,
        action,
        path: repo.path,
        command,
        url: action === "clone" ? cloneUrl : undefined,
      });

      if (!data.success) {
        toast.error(data.message || `Failed to ${action} repository.`);
      } else {
        toast.success(`${action} completed for ${repo.name}.`);
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

      if (action === "pull") {
        await fetchRepositories(connection);
      }
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : `Failed to ${action} repository.`;
      toast.error(message);
      setModal((prev) =>
        prev ? { ...prev, output: message, isLoading: false } : null
      );
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
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              <FolderGit className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Repositories</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage projects in{" "}
                <span className="font-medium text-foreground">/var/www</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="https://github.com/user/repo.git"
              value={cloneUrl}
              onChange={(e) => setCloneUrl(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none dark:border-white/10 dark:bg-white/5"
            />
            <button
              onClick={handleClone}
              disabled={!cloneUrl.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
            >
              <Download className="h-4 w-4" />
              Clone
            </button>
            <button
              onClick={() => fetchRepositories(connection)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {repositories.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 py-12 text-center dark:border-white/10 dark:bg-white/5">
            <FolderGit className="h-10 w-10 text-gray-400" />
            <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-300">
              No repositories found
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              /var/www is empty or the path does not exist.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                    Repository
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                    Branch
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                    Path
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {repositories.map((repo) => (
                  <tr
                    key={repo.path}
                    className="transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[.03]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-semibold">
                        {repo.isGit && (
                          <GitBranch className="h-4 w-4 text-purple-500" />
                        )}
                        {repo.name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {repo.isGit ? (
                        <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                          {repo.branch}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Not git
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                      {repo.path}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {repo.isGit && (
                          <>
                            <ActionButton
                              onClick={() => runAction(repo, "status")}
                              icon={<Terminal className="h-3.5 w-3.5" />}
                              label="Status"
                            />
                            <ActionButton
                              onClick={() => runAction(repo, "pull")}
                              icon={<Download className="h-3.5 w-3.5" />}
                              label="Pull"
                            />
                          </>
                        )}
                        <div className="flex items-center gap-2">
                          <select
                            value={buildCommand}
                            onChange={(e) => setBuildCommand(e.target.value)}
                            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none dark:border-white/10 dark:bg-white/5"
                          >
                            {BUILD_COMMANDS.map((cmd) => (
                              <option key={cmd.value} value={cmd.value}>
                                {cmd.label}
                              </option>
                            ))}
                          </select>
                          <ActionButton
                            onClick={() => runAction(repo, "build", buildCommand)}
                            icon={<Play className="h-3.5 w-3.5" />}
                            label="Build"
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
                  {modal.action}: {modal.repo.name}
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

function ActionButton({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
    >
      {icon}
      {label}
    </button>
  );
}
