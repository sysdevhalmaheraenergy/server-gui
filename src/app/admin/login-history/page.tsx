"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { History, RefreshCw, User, Globe } from "lucide-react";
import { toast } from "sonner";
import { CONNECTION_KEY, type ServerConnection } from "@/lib/connection";

interface LoginEntry {
  user: string;
  terminal: string;
  ip: string;
  loginTime: string;
  logoutTime: string;
  duration: string;
}

export default function LoginHistoryPage() {
  const router = useRouter();
  const [connection, setConnection] = useState<ServerConnection | null>(null);
  const [entries, setEntries] = useState<LoginEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 10;

  useEffect(() => {
    const raw = sessionStorage.getItem(CONNECTION_KEY);
    if (!raw) {
      router.replace("/admin/connect");
      return;
    }
    try {
      const conn = JSON.parse(raw) as ServerConnection;
      setConnection(conn);
      fetchLoginHistory(conn);
    } catch {
      sessionStorage.removeItem(CONNECTION_KEY);
      router.replace("/admin/connect");
    }
  }, [router]);

  const fetchLoginHistory = async (conn: ServerConnection) => {
    setIsLoading(true);

    try {
      const { data } = await axios.post("/api/ssh/login-history", conn);

      if (!data.success) {
        toast.error(data.message || "Failed to fetch login history.");
      } else {
        setEntries(data.entries);
        setCurrentPage(1);
      }
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : "Failed to fetch login history.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEntries = searchTerm.trim()
    ? entries.filter(
        (entry) =>
          entry.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.ip.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : entries;

  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage
  );

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
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Login History</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Recent SSH sessions on this server
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchLoginHistory(connection)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search by username or IP..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 pl-8 text-sm outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:focus:border-indigo-600 sm:w-64"
          />
          <svg
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
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

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 py-8 text-center dark:border-white/10 dark:bg-white/5">
            <History className="h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-300">
              No login history found
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No recent SSH sessions detected on this server.
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
                    User
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                    Terminal
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                    IP Address
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                    Login Time
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                    Duration
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {paginatedEntries.map((entry, index) => {
                  const isOnline = entry.logoutTime === "still logged in";
                  const rowNum =
                    (currentPage - 1) * entriesPerPage + index + 1;

                  return (
                    <tr
                      key={`${entry.user}-${entry.terminal}-${entry.loginTime}-${index}`}
                      className="transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[.03]"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                        {rowNum}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-gray-400" />
                          <span className="font-medium">{entry.user}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700 dark:bg-white/10 dark:text-gray-300">
                          {entry.terminal}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-gray-400" />
                          <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                            {entry.ip}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                        {entry.loginTime}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                        {entry.duration || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            isOnline
                              ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                              : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-400"
                          }`}
                        >
                          {isOnline ? "Online" : "Offline"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(currentPage - 1) * entriesPerPage + 1} to{" "}
              {Math.min(currentPage * entriesPerPage, filteredEntries.length)}{" "}
              of {filteredEntries.length} entries
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                      currentPage === page
                        ? "bg-indigo-600 text-white"
                        : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
