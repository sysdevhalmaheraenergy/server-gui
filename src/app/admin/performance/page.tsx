"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Clock,
  List,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  CONNECTION_KEY,
  type ServerConnection,
} from "@/lib/connection";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
);

interface PerformanceStats {
  cpu: number;
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  disk: {
    total: string;
    used: string;
    available: string;
    percentage: number;
  };
  load: {
    oneMin: number;
    fiveMin: number;
    fifteenMin: number;
  };
  uptime: string;
  processes: number;
}

interface MetricHistory {
  cpu: number[];
  memory: number[];
  disk: number[];
  load: number[];
  timestamps: string[];
}

const MAX_HISTORY = 20;

export default function PerformancePage() {
  const router = useRouter();
  const [connection, setConnection] = useState<ServerConnection | null>(null);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [history, setHistory] = useState<MetricHistory>({
    cpu: [],
    memory: [],
    disk: [],
    load: [],
    timestamps: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(CONNECTION_KEY);
    if (!raw) {
      router.replace("/admin/connect");
      return;
    }
    try {
      const conn = JSON.parse(raw) as ServerConnection;
      setConnection(conn);
      fetchStats(conn);
    } catch {
      sessionStorage.removeItem(CONNECTION_KEY);
      router.replace("/admin/connect");
    }
  }, [router]);

  useEffect(() => {
    if (!connection) return;

    const interval = setInterval(() => {
      fetchStats(connection, false);
    }, 5000);

    return () => clearInterval(interval);
  }, [connection]);

  const fetchStats = async (conn: ServerConnection, showLoading = true) => {
    if (showLoading) setIsLoading(true);

    try {
      const { data } = await axios.post("/api/ssh/performance", conn);

      if (!data.success) {
        toast.error(data.message || "Failed to fetch performance stats.");
      } else {
        const newStats = data.stats as PerformanceStats;
        setStats(newStats);
        setLastUpdated(new Date());

        setHistory((prev) => {
          const timestamp = new Date().toLocaleTimeString();
          const next: MetricHistory = {
            cpu: [...prev.cpu, newStats.cpu].slice(-MAX_HISTORY),
            memory: [...prev.memory, newStats.memory.percentage].slice(-MAX_HISTORY),
            disk: [...prev.disk, newStats.disk.percentage].slice(-MAX_HISTORY),
            load: [...prev.load, newStats.load.oneMin].slice(-MAX_HISTORY),
            timestamps: [...prev.timestamps, timestamp].slice(-MAX_HISTORY),
          };
          return next;
        });
      }
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : "Failed to fetch performance stats.";
      toast.error(message);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const formatMemory = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb} MB`;
  };

  const buildChartData = (data: number[], color: string): ChartData<"line"> => ({
    labels: history.timestamps,
    datasets: [
      {
        data,
        borderColor: color,
        backgroundColor: `${color}20`,
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  });

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: "index",
        intersect: false,
        callbacks: {
          title: () => "",
          label: (context) => `${(context.parsed.y ?? 0).toFixed(1)}%`,
        },
      },
    },
    scales: {
      x: { display: false },
      y: {
        display: false,
        min: 0,
        max: 100,
      },
    },
    interaction: {
      mode: "nearest",
      axis: "x",
      intersect: false,
    },
  };

  const loadChartOptions: ChartOptions<"line"> = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        mode: "index",
        intersect: false,
        callbacks: {
          title: () => "",
          label: (context) => (context.parsed.y ?? 0).toFixed(2),
        },
      },
    },
    scales: {
      x: { display: false },
      y: { display: false },
    },
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Server Performance</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Live stats from{" "}
                <span className="font-medium text-foreground">
                  {connection.name || connection.host}:{connection.port}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => fetchStats(connection)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {!stats ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon={<Cpu className="h-5 w-5" />}
              label="CPU Usage"
              value={`${stats.cpu.toFixed(1)}%`}
              percentage={stats.cpu}
              color="rgb(59, 130, 246)"
              chart={
                history.cpu.length > 1 ? (
                  <Line
                    data={buildChartData(history.cpu, "rgb(59, 130, 246)")}
                    options={chartOptions}
                  />
                ) : null
              }
            />

            <StatCard
              icon={<MemoryStick className="h-5 w-5" />}
              label="Memory Usage"
              value={`${stats.memory.percentage}%`}
              subvalue={`${formatMemory(stats.memory.used)} / ${formatMemory(stats.memory.total)}`}
              percentage={stats.memory.percentage}
              color="rgb(139, 92, 246)"
              chart={
                history.memory.length > 1 ? (
                  <Line
                    data={buildChartData(history.memory, "rgb(139, 92, 246)")}
                    options={chartOptions}
                  />
                ) : null
              }
            />

            <StatCard
              icon={<HardDrive className="h-5 w-5" />}
              label="Disk Usage"
              value={`${stats.disk.percentage}%`}
              subvalue={`${stats.disk.used} / ${stats.disk.total}`}
              percentage={stats.disk.percentage}
              color="rgb(245, 158, 11)"
              chart={
                history.disk.length > 1 ? (
                  <Line
                    data={buildChartData(history.disk, "rgb(245, 158, 11)")}
                    options={chartOptions}
                  />
                ) : null
              }
            />

            <StatCard
              icon={<Activity className="h-5 w-5" />}
              label="Load Average"
              value={`${stats.load.oneMin.toFixed(2)}`}
              subvalue={`5m: ${stats.load.fiveMin.toFixed(2)} · 15m: ${stats.load.fifteenMin.toFixed(2)}`}
              color="rgb(244, 63, 94)"
              chart={
                history.load.length > 1 ? (
                  <Line
                    data={buildChartData(
                      history.load.map((v) => Math.min(v * 20, 100)),
                      "rgb(244, 63, 94)"
                    )}
                    options={loadChartOptions}
                  />
                ) : null
              }
            />

            <StatCard
              icon={<Clock className="h-5 w-5" />}
              label="Uptime"
              value={stats.uptime}
              color="rgb(6, 182, 212)"
            />

            <StatCard
              icon={<List className="h-5 w-5" />}
              label="Processes"
              value={stats.processes.toString()}
              color="rgb(99, 102, 241)"
            />
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subvalue,
  percentage,
  color,
  chart,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subvalue?: string;
  percentage?: number;
  color: string;
  chart?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-white/10 dark:bg-white/5">
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subvalue && (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {subvalue}
        </div>
      )}
      {typeof percentage === "number" && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%`, backgroundColor: color }}
          />
        </div>
      )}
      {chart && <div className="mt-4 h-24 w-full">{chart}</div>}
    </div>
  );
}
