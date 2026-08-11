import { NextRequest, NextResponse } from "next/server";
import { executeSshCommand, type SshCredentials } from "@/lib/ssh";

export const runtime = "nodejs";

interface LoginEntry {
  user: string;
  terminal: string;
  ip: string;
  loginTime: string;
  logoutTime: string;
  duration: string;
}

function parseLastOutput(output: string): LoginEntry[] {
  const lines = output.split("\n").filter((line) => line.trim());
  const entries: LoginEntry[] = [];

  for (const line of lines) {
    // Skip empty lines, header lines, and reboot entries
    if (
      !line.trim() ||
      line.startsWith("wtmp begins") ||
      line.startsWith("reboot")
    ) {
      continue;
    }

    // Format: user  terminal  ip  Day Mon DD HH:MM:SS YYYY - Day Mon DD HH:MM:SS  (duration)
    // Still logged in: user  terminal  ip  Day Mon DD HH:MM:SS  still logged in
    const match = line.match(
      /^(\S+)\s+(\S+)\s+(\S+)\s+(\w+\s+\w+\s+\d+\s+\d+:\d+:\d+\s+\d+)\s+-\s+(.+?)(?:\s+\((.+?)\))?$/
    );

    if (match) {
      const [, user, terminal, ip, loginTime, logoutPart, duration] = match;
      entries.push({
        user,
        terminal,
        ip: ip === "0.0.0.0" ? "Local" : ip,
        loginTime: loginTime.trim(),
        logoutTime: logoutPart.trim(),
        duration: duration?.trim() || "",
      });
      continue;
    }

    // Handle "still logged in" format
    const stillLoggedInMatch = line.match(
      /^(\S+)\s+(\S+)\s+(\S+)\s+(\w+\s+\w+\s+\d+\s+\d+:\d+:\d+\s+\d+)\s+still logged in/
    );

    if (stillLoggedInMatch) {
      const [, user, terminal, ip, loginTime] = stillLoggedInMatch;
      entries.push({
        user,
        terminal,
        ip: ip === "0.0.0.0" ? "Local" : ip,
        loginTime: loginTime.trim(),
        logoutTime: "still logged in",
        duration: "",
      });
      continue;
    }

    // Handle "gone - no logout" format
    const goneMatch = line.match(
      /^(\S+)\s+(\S+)\s+(\S+)\s+(\w+\s+\w+\s+\d+\s+\d+:\d+:\d+\s+\d+)\s+gone - no logout/
    );

    if (goneMatch) {
      const [, user, terminal, ip, loginTime] = goneMatch;
      entries.push({
        user,
        terminal,
        ip: ip === "0.0.0.0" ? "Local" : ip,
        loginTime: loginTime.trim(),
        logoutTime: "gone - no logout",
        duration: "",
      });
    }
  }

  return entries;
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

  const result = await executeSshCommand({
    host,
    port,
    username,
    password,
    command: "last -200 -i -F",
  });

  if (!result.success) {
    return NextResponse.json({
      success: false,
      message: result.message || result.error || "Failed to fetch login history.",
    });
  }

  const entries = parseLastOutput(result.output);

  return NextResponse.json({
    success: true,
    entries,
  });
}
