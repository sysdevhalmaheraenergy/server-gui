import { NextRequest, NextResponse } from "next/server";
import {
  executeSshCommand,
  type SshCredentials,
} from "@/lib/ssh";

export const runtime = "nodejs";

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

export async function POST(request: NextRequest) {
  let body: SshCredentials;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body." },
      { status: 400 }
    );
  }

  const { host, port, username, password } = body;

  if (!host || !port || !username || !password) {
    return NextResponse.json(
      {
        success: false,
        message: "Host, port, username, and password are required.",
      },
      { status: 400 }
    );
  }

  const credentials: SshCredentials = { host, port, username, password };

  try {
    const stats = await gatherStats(credentials);

    if (
      stats.cpu === 0 &&
      stats.memory.total === 0 &&
      stats.disk.percentage === 0 &&
      stats.load.oneMin === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Could not fetch any performance metrics from the server.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, stats });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to fetch performance stats." },
      { status: 500 }
    );
  }
}

async function gatherStats(credentials: SshCredentials): Promise<PerformanceStats> {
  const stats: PerformanceStats = {
    cpu: 0,
    memory: { total: 0, used: 0, free: 0, percentage: 0 },
    disk: { total: "-", used: "-", available: "-", percentage: 0 },
    load: { oneMin: 0, fiveMin: 0, fifteenMin: 0 },
    uptime: "-",
    processes: 0,
  };

  // CPU usage using a 1-second snapshot of /proc/stat
  const cpuResult = await executeSshCommand({
    ...credentials,
    command:
      "cat <(grep '^cpu ' /proc/stat | awk '{print ($2+$4),($2+$4+$5)}') <(sleep 1; grep '^cpu ' /proc/stat | awk '{print ($2+$4),($2+$4+$5)}') | awk 'NR==1{prev=$1;total=$2} NR==2{printf \"%.1f\", ($1-prev)*100/($2-total)}'",
    timeout: 10000,
  });
  if (cpuResult.success && cpuResult.output) {
    const value = parseFloat(cpuResult.output);
    if (!isNaN(value)) stats.cpu = Math.min(Math.max(value, 0), 100);
  }

  // Memory
  const memoryResult = await executeSshCommand({
    ...credentials,
    command: "free -m | awk 'NR==2{print $2,$3,$7}'",
  });
  if (memoryResult.success && memoryResult.output) {
    const [total, used, available] = memoryResult.output
      .trim()
      .split(/\s+/)
      .map(Number);
    if (total && !isNaN(total)) {
      stats.memory = {
        total,
        used: used || 0,
        free: available || 0,
        percentage: total > 0 ? Math.round(((used || 0) / total) * 100) : 0,
      };
    }
  }

  // Disk
  const diskResult = await executeSshCommand({
    ...credentials,
    command: "df -h / | awk 'NR==2 {print $2,$3,$4,$5}'",
  });
  if (diskResult.success && diskResult.output) {
    const parts = diskResult.output.trim().split(/\s+/);
    if (parts.length >= 4) {
      stats.disk = {
        total: parts[0],
        used: parts[1],
        available: parts[2],
        percentage: parseInt(parts[3].replace("%", ""), 10) || 0,
      };
    }
  }

  // Load average
  const loadResult = await executeSshCommand({
    ...credentials,
    command: "cat /proc/loadavg | awk '{print $1,$2,$3}'",
  });
  if (loadResult.success && loadResult.output) {
    const [oneMin, fiveMin, fifteenMin] = loadResult.output
      .trim()
      .split(/\s+/)
      .map((v) => parseFloat(v) || 0);
    stats.load = { oneMin, fiveMin, fifteenMin };
  }

  // Uptime
  const uptimeResult = await executeSshCommand({
    ...credentials,
    command: "uptime -p 2>/dev/null || uptime | sed 's/.*up \\([^,]*\\),.*/\\1/'",
  });
  if (uptimeResult.success && uptimeResult.output) {
    stats.uptime = uptimeResult.output.trim();
  }

  // Process count
  const processesResult = await executeSshCommand({
    ...credentials,
    command: "ps aux | wc -l",
  });
  if (processesResult.success && processesResult.output) {
    const count = parseInt(processesResult.output.trim(), 10);
    if (!isNaN(count)) stats.processes = count;
  }

  return stats;
}
