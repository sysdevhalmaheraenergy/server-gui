import { NextRequest, NextResponse } from "next/server";
import {
  executeSudoDockerCommand,
  executeSshCommand,
  type SshCredentials,
} from "@/lib/ssh";

export const runtime = "nodejs";

interface ExecuteBody extends SshCredentials {
  action:
    | "deploy"
    | "stop"
    | "start"
    | "restart"
    | "remove"
    | "logs"
    | "test";
  containerId?: string;
  containerName?: string;
  image?: string;
  containerPort?: string;
}

export async function POST(request: NextRequest) {
  let body: ExecuteBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body." },
      { status: 400 }
    );
  }

  const { host, port, username, password, action } = body;

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

  let result;

  switch (action) {
    case "test": {
      result = await executeSshCommand({
        ...credentials,
        command: "hostname",
      });
      if (result.success) {
        result.output = `Connected to ${result.output.trim()} (${host}:${port}) as ${username}.`;
      }
      break;
    }
    case "deploy": {
      if (!body.image || !body.containerName) {
        return NextResponse.json(
          { success: false, message: "Image and container name are required." },
          { status: 400 }
        );
      }
      const portArg = body.containerPort ? `-p ${body.containerPort}` : "";
      result = await executeSudoDockerCommand(
        credentials,
        `run -d --name ${body.containerName} ${portArg} ${body.image}`.trim()
      );
      break;
    }
    case "stop":
      if (!body.containerId) {
        return NextResponse.json(
          { success: false, message: "Container ID is required." },
          { status: 400 }
        );
      }
      result = await executeSudoDockerCommand(
        credentials,
        `stop ${body.containerId}`
      );
      break;
    case "start":
      if (!body.containerId) {
        return NextResponse.json(
          { success: false, message: "Container ID is required." },
          { status: 400 }
        );
      }
      result = await executeSudoDockerCommand(
        credentials,
        `start ${body.containerId}`
      );
      break;
    case "restart":
      if (!body.containerId) {
        return NextResponse.json(
          { success: false, message: "Container ID is required." },
          { status: 400 }
        );
      }
      result = await executeSudoDockerCommand(
        credentials,
        `restart ${body.containerId}`
      );
      break;
    case "remove":
      if (!body.containerId) {
        return NextResponse.json(
          { success: false, message: "Container ID is required." },
          { status: 400 }
        );
      }
      result = await executeSudoDockerCommand(
        credentials,
        `rm -f ${body.containerId}`
      );
      break;
    case "logs":
      if (!body.containerId) {
        return NextResponse.json(
          { success: false, message: "Container ID is required." },
          { status: 400 }
        );
      }
      result = await executeSudoDockerCommand(
        credentials,
        `logs --tail 100 ${body.containerId}`
      );
      break;
    default:
      return NextResponse.json(
        { success: false, message: "Invalid action." },
        { status: 400 }
      );
  }

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        message: result.message || result.error || "Command failed.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    output: result.output,
    message: result.output || "Command executed successfully.",
  });
}
