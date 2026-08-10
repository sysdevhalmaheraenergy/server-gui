import { NextRequest, NextResponse } from "next/server";
import {
  executeSudoCommand,
  type SshCredentials,
} from "@/lib/ssh";

export const runtime = "nodejs";

interface UfwBody extends SshCredentials {
  action: "status" | "allow" | "deny" | "delete" | "reload";
  rule?: string;
  targetPort?: string;
  protocol?: "tcp" | "udp";
}

export async function POST(request: NextRequest) {
  let body: UfwBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body." },
      { status: 400 }
    );
  }

  const { host, port, username, password, action, rule, targetPort, protocol } = body;

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

  switch (action) {
    case "status": {
      const result = await executeSudoCommand({
        ...credentials,
        command: "sudo ufw status",
      });

      return NextResponse.json({
        success: result.success,
        output: result.output,
        message: result.success ? undefined : result.message || result.error,
      });
    }

    case "allow": {
      if (!targetPort) {
        return NextResponse.json(
          { success: false, message: "Port is required for allow action." },
          { status: 400 }
        );
      }

      const cmd = protocol
        ? `sudo ufw allow ${targetPort}/${protocol}`
        : `sudo ufw allow ${targetPort}`;

      const result = await executeSudoCommand({
        ...credentials,
        command: cmd,
      });

      return NextResponse.json({
        success: result.success,
        output: result.output,
        message: result.success
          ? `Port ${targetPort}${protocol ? `/${protocol}` : ""} allowed successfully.`
          : result.message || result.error,
      });
    }

    case "deny": {
      if (!targetPort) {
        return NextResponse.json(
          { success: false, message: "Port is required for deny action." },
          { status: 400 }
        );
      }

      const cmd = protocol
        ? `sudo ufw deny ${targetPort}/${protocol}`
        : `sudo ufw deny ${targetPort}`;

      const result = await executeSudoCommand({
        ...credentials,
        command: cmd,
      });

      return NextResponse.json({
        success: result.success,
        output: result.output,
        message: result.success
          ? `Port ${targetPort}${protocol ? `/${protocol}` : ""} denied successfully.`
          : result.message || result.error,
      });
    }

    case "delete": {
      if (!rule) {
        return NextResponse.json(
          { success: false, message: "Rule is required for delete action." },
          { status: 400 }
        );
      }

      const result = await executeSudoCommand({
        ...credentials,
        command: `sudo ufw delete ${rule}`,
      });

      return NextResponse.json({
        success: result.success,
        output: result.output,
        message: result.success
          ? "Rule deleted successfully."
          : result.message || result.error,
      });
    }

    case "reload": {
      const result = await executeSudoCommand({
        ...credentials,
        command: "sudo ufw reload",
      });

      return NextResponse.json({
        success: result.success,
        output: result.output,
        message: result.success
          ? "UFW reloaded successfully."
          : result.message || result.error,
      });
    }

    default:
      return NextResponse.json(
        { success: false, message: "Invalid action." },
        { status: 400 }
      );
  }
}
