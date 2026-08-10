import { NextRequest, NextResponse } from "next/server";
import {
  executeSudoDockerCommand,
  type SshCredentials,
} from "@/lib/ssh";

export const runtime = "nodejs";

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

  const result = await executeSudoDockerCommand(
    credentials,
    'ps -a --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Ports}}|{{.Status}}"'
  );

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        message: result.message || result.error || "Failed to list containers.",
      },
      { status: 500 }
    );
  }

  const containers = result.output
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      const [id, name, image, ports, status] = line.split("|");
      const isRunning = status?.toLowerCase().startsWith("up") ?? false;
      return {
        id: id?.slice(0, 12) || "",
        name: name || "",
        image: image || "",
        port: ports || undefined,
        status: isRunning ? "running" : "stopped",
      };
    });

  return NextResponse.json({ success: true, containers });
}
