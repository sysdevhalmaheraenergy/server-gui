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
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { CONNECTION_KEY, type ServerConnection } from "@/lib/connection";

interface Repository {
  name: string;
  path: string;
  isGit: boolean;
  branch: string;
  branches?: string[];
}

interface LogModal {
  repo: Repository;
  action:
    | "status"
    | "pull"
    | "build"
    | "clone"
    | "checkout"
    | "restart"
    | "stop"
    | "start"
    | "update";
  output: string;
  isLoading: boolean;
  startTime?: number;
  progress?: number;
}

interface BranchModal {
  repo: Repository;
  search: string;
}

interface RenameModal {
  repo: Repository;
  newName: string;
}

const BUILD_COMMANDS = [
  { label: "Build docker compose", value: "sudo docker compose up --build -d" },
  { label: "Take down docker compose", value: "sudo docker compose down" },
  {
    label: "Update docker compose",
    value:
      "git pull && sudo docker compose down && sudo docker compose up --build -d",
  },
];

export default function RepositoryPage() {
  const router = useRouter();
  const [connection, setConnection] = useState<ServerConnection | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState<LogModal | null>(null);
  const [branchModal, setBranchModal] = useState<BranchModal | null>(null);
  const [renameModal, setRenameModal] = useState<RenameModal | null>(null);
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

  // Progress animation for build
  useEffect(() => {
    if (!modal?.isLoading || modal.action !== "build") return;

    const interval = setInterval(() => {
      setModal((prev) => {
        if (!prev || !prev.isLoading) return prev;
        const elapsed = Date.now() - (prev.startTime || Date.now());
        // Asymptotic progress: fast at start, slows down near 90%
        const progress = Math.min(90, 100 * (1 - Math.exp(-elapsed / 15000)));
        return { ...prev, progress };
      });
    }, 200);

    return () => clearInterval(interval);
  }, [modal?.isLoading, modal?.action]);

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

  const fetchBranches = async (repo: Repository) => {
    if (!connection) return;

    setBranchModal({ repo, search: "" });

    if (!repo.branches) {
      try {
        const { data } = await axios.post("/api/ssh/repository", {
          ...connection,
          action: "branches",
          path: repo.path,
        });

        if (data.success) {
          setRepositories((prev) =>
            prev.map((r) =>
              r.path === repo.path ? { ...r, branches: data.branches } : r,
            ),
          );
        }
      } catch {
        toast.error("Failed to fetch branches.");
      }
    }
  };

  const handleCheckout = async (repo: Repository, branch: string) => {
    if (!connection || !branch) return;

    setModal({
      repo,
      action: "checkout",
      output: `$ git checkout ${branch}\n`,
      isLoading: true,
    });

    try {
      const { data } = await axios.post("/api/ssh/repository", {
        ...connection,
        action: "checkout",
        path: repo.path,
        branch,
      });

      if (!data.success) {
        toast.error(data.message || "Failed to switch branch.");
      } else {
        toast.success(`Switched to branch ${branch}`);
        setBranchModal(null);
        await fetchRepositories(connection);
      }

      setModal((prev) =>
        prev
          ? {
              ...prev,
              output: data.output || data.message || "No output.",
              isLoading: false,
            }
          : null,
      );
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : "Failed to switch branch.";
      toast.error(message);
      setModal((prev) =>
        prev ? { ...prev, output: message, isLoading: false } : null,
      );
    }
  };

  const handleRename = async () => {
    if (!connection || !renameModal || !renameModal.newName.trim()) return;

    try {
      const { data } = await axios.post("/api/ssh/repository", {
        ...connection,
        action: "rename",
        path: renameModal.repo.path,
        newName: renameModal.newName.trim(),
      });

      if (!data.success) {
        toast.error(data.message || "Failed to rename repository.");
      } else {
        toast.success(data.message || "Repository renamed successfully.");
        setRenameModal(null);
        await fetchRepositories(connection);
      }
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : "Failed to rename repository.";
      toast.error(message);
    }
  };

  const handleClone = async () => {
    if (!connection || !cloneUrl.trim()) return;

    const dummyRepo: Repository = {
      name: cloneUrl.split("/").pop()?.replace(".git", "") || "repo",
      path: "/var/www",
      isGit: true,
      branch: "-",
    };

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
          : null,
      );
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : "Failed to clone repository.";
      toast.error(message);
      setModal((prev) =>
        prev ? { ...prev, output: message, isLoading: false } : null,
      );
    }
  };

  const runAction = async (
    repo: Repository,
    action: "status" | "pull" | "build" | "clone" | "checkout",
    command?: string,
  ) => {
    if (!connection) return;

    setModal({
      repo,
      action,
      output: action === "build" ? `$ ${command}\n` : "",
      isLoading: true,
      startTime: action === "build" ? Date.now() : undefined,
      progress: action === "build" ? 0 : undefined,
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
          : null,
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
        prev ? { ...prev, output: message, isLoading: false } : null,
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
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
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
                              onClick={() => fetchBranches(repo)}
                              icon={<GitBranch className="h-3.5 w-3.5" />}
                              label={repo.branch}
                            />
                          </>
                        )}
                        <ActionButton
                          onClick={() => runAction(repo, "pull")}
                          icon={<Download className="h-3.5 w-3.5" />}
                          label="Pull"
                        />
                        <ActionButton
                          onClick={() =>
                            setRenameModal({ repo, newName: repo.name })
                          }
                          icon={<Pencil className="h-3.5 w-3.5" />}
                          label="Rename"
                        />
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
                            onClick={() =>
                              runAction(repo, "build", buildCommand)
                            }
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

            {/* Progress bar for build */}
            {modal.action === "build" && modal.isLoading && (
              <div className="border-b border-gray-200 px-5 py-3 dark:border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Building...
                  </span>
                  <span className="text-sm font-mono text-blue-600 dark:text-blue-400">
                    {Math.round(modal.progress || 0)}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-300 ease-out"
                    style={{ width: `${modal.progress || 0}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {modal.progress! < 30
                    ? "Initializing build process..."
                    : modal.progress! < 60
                      ? "Compiling and bundling..."
                      : modal.progress! < 80
                        ? "Running optimizations..."
                        : "Almost done..."}
                </p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto bg-[#0B1120] p-4 font-mono text-xs leading-relaxed text-green-400">
              {modal.isLoading ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-600 border-t-gray-300" />
                  Running {modal.action}...
                </div>
              ) : (
                <>
                  {modal.action === "build" && (
                    <div className="mb-3 flex items-center gap-2 text-green-400">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="font-medium">
                        Build completed successfully
                      </span>
                    </div>
                  )}
                  {modal.output.split("\n").map((line, index) => (
                    <div key={index} className="py-0.5">
                      {line}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Branch Selection Modal */}
      {branchModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setBranchModal(null)}
        >
          <div
            className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0f172a]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-white/10">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-purple-500" />
                <h3 className="text-base font-bold">
                  Switch Branch: {branchModal.repo.name}
                </h3>
              </div>
              <button
                onClick={() => setBranchModal(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-foreground dark:text-gray-400 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4">
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Search branches..."
                  value={branchModal.search}
                  onChange={(e) =>
                    setBranchModal((prev) =>
                      prev ? { ...prev, search: e.target.value } : null
                    )
                  }
                  autoFocus
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pl-9 text-sm outline-none focus:border-purple-400 dark:border-white/10 dark:bg-white/5 dark:focus:border-purple-600"
                />
                <svg
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-white/10">
                {branchModal.repo.branches ? (
                  (() => {
                    const filtered = branchModal.repo.branches.filter((b) =>
                      b.toLowerCase().includes(branchModal.search.toLowerCase())
                    );
                    return filtered.length > 0 ? (
                      filtered.map((branch) => (
                        <button
                          key={branch}
                          onClick={() =>
                            handleCheckout(branchModal.repo, branch)
                          }
                          className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${
                            branch === branchModal.repo.branch
                              ? "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          <GitBranch
                            className={`h-3.5 w-3.5 ${
                              branch === branchModal.repo.branch
                                ? "text-purple-500"
                                : "text-gray-400"
                            }`}
                          />
                          <span className="flex-1 truncate">{branch}</span>
                          {branch === branchModal.repo.branch && (
                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                              current
                            </span>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        No branches found
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setRenameModal(null)}
        >
          <div
            className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0f172a]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-blue-500" />
                <h3 className="text-base font-bold">
                  Rename: {renameModal.repo.name}
                </h3>
              </div>
              <button
                onClick={() => setRenameModal(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-foreground dark:text-gray-400 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                New name
              </label>
              <input
                type="text"
                value={renameModal.newName}
                onChange={(e) =>
                  setRenameModal((prev) =>
                    prev ? { ...prev, newName: e.target.value } : null
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                }}
                autoFocus
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 dark:border-white/10 dark:bg-white/5 dark:focus:border-blue-600"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setRenameModal(null)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRename}
                  disabled={
                    !renameModal.newName.trim() ||
                    renameModal.newName.trim() === renameModal.repo.name
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700 disabled:opacity-50"
                >
                  Rename
                </button>
              </div>
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
