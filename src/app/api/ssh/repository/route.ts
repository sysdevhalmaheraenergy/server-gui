import { NextRequest, NextResponse } from "next/server";
import {
  executeSshCommand,
  executeSudoCommand,
  type SshCredentials,
} from "@/lib/ssh";

export const runtime = "nodejs";

interface RepositoryBody extends SshCredentials {
  action?: "list" | "status" | "pull" | "build" | "clone" | "branches" | "checkout" | "rename" | "test-git";
  path?: string;
  command?: string;
  url?: string;
  branch?: string;
  newName?: string;
}

export async function POST(request: NextRequest) {
  let body: RepositoryBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body." },
      { status: 400 },
    );
  }

  const {
    host,
    port,
    username,
    password,
    action = "list",
    path,
    command,
    url,
    branch,
    newName,
  } = body;

  if (!host || !port || !username || !password) {
    return NextResponse.json(
      {
        success: false,
        message: "Host, port, username, and password are required.",
      },
      { status: 400 },
    );
  }

  const credentials: SshCredentials = { host, port, username, password };

  switch (action) {
    case "list": {
      const result = await executeSshCommand({
        ...credentials,
        command: "ls -1 /var/www",
      });

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            message:
              result.message || result.error || "Failed to list repositories.",
          },
          { status: 500 },
        );
      }

      const names = result.output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const repos = await Promise.all(
        names.map(async (name) => {
          const gitResult = await executeSshCommand({
            ...credentials,
            command: `git config --global --add safe.directory '*' && cd /var/www/${name} && git rev-parse --is-inside-work-tree 2>/dev/null && git branch --show-current 2>/dev/null || echo "-"`,
          });

          const [isGit, branch] = gitResult.success
            ? gitResult.output.trim().split("\n")
            : ["false", "-"];

          return {
            name,
            path: `/var/www/${name}`,
            isGit: isGit.trim() === "true",
            branch: branch?.trim() || "-",
          };
        }),
      );

      return NextResponse.json({ success: true, repositories: repos });
    }

    case "status": {
      if (!path) {
        return NextResponse.json(
          { success: false, message: "Repository path is required." },
          { status: 400 },
        );
      }

      const result = await executeSshCommand({
        ...credentials,
        command: `git config --global --add safe.directory '*' && cd ${path} && git status --short --branch 2>/dev/null || echo "Not a git repository"`,
      });

      return NextResponse.json({
        success: result.success,
        output: result.output,
        message: result.success ? undefined : result.message || result.error,
      });
    }

    case "pull": {
      if (!path) {
        return NextResponse.json(
          { success: false, message: "Repository path is required." },
          { status: 400 },
        );
      }

      const repoName = path.split("/").pop()?.replace(".git", "") || "repo";

      // Run as connected user to preserve SSH agent access
      let result = await executeSshCommand({
        ...credentials,
        command: `git config --global --add safe.directory '/var/www/${repoName}' && cd ${path} && git pull 2>&1`,
      });

      // If permission denied on .git files, fix ownership and retry
      if (
        !result.success &&
        result.output.includes("Permission denied") &&
        result.output.includes(".git/")
      ) {
        const fixResult = await executeSudoCommand({
          ...credentials,
          command: `chown -R ${username}:${username} ${path}/.git`,
        });

        if (fixResult.success) {
          result = await executeSshCommand({
            ...credentials,
            command: `git config --global --add safe.directory '/var/www/${repoName}' && cd ${path} && git pull 2>&1`,
          });
          result.output = `[Fixed .git permissions]\n${fixResult.output}\n\n${result.output}`;
        }
      }

      return NextResponse.json({
        success: result.success,
        output: result.output,
        message: result.success ? undefined : result.message || result.error,
      });
    }

    case "build": {
      if (!path || !command) {
        return NextResponse.json(
          {
            success: false,
            message: "Repository path and build command are required.",
          },
          { status: 400 },
        );
      }

      // Split command to run git as user, then docker as root
      const hasGitPull = command.startsWith("git pull");
      let buildResult;

      if (hasGitPull) {
        const gitPart = "git pull";
        const remaining = command.replace("git pull", "").trim();

        // Run git pull as user first
        const gitResult = await executeSshCommand({
          ...credentials,
          command: `git config --global --add safe.directory '/var/www/${path.split("/").pop() || "repo"}' && cd ${path} && ${gitPart} 2>&1`,
        });

        if (!gitResult.success) {
          buildResult = gitResult;
        } else if (remaining) {
          // Run remaining commands with sudo
          buildResult = await executeSudoCommand({
            ...credentials,
            command: `cd ${path} && ${remaining}`,
            timeout: 300000,
          });
          // Prepend git output
          buildResult.output = gitResult.output + "\n" + buildResult.output;
        } else {
          buildResult = gitResult;
        }
      } else {
        buildResult = await executeSudoCommand({
          ...credentials,
          command: `cd ${path} && ${command}`,
          timeout: 300000,
        });
      }

      return NextResponse.json({
        success: buildResult.success,
        output: buildResult.output,
        message: buildResult.success
          ? undefined
          : buildResult.message || buildResult.error,
      });
    }

    case "clone": {
      if (!url) {
        return NextResponse.json(
          { success: false, message: "Git clone URL is required." },
          { status: 400 },
        );
      }

      // Run as user to preserve SSH agent access
      const cloneResult = await executeSshCommand({
        ...credentials,
        command: `git config --global --add safe.directory '/var/www/${url.split("/").pop()?.replace(".git", "") || "repo"}' && cd /var/www && git clone ${url}`,
        timeout: 300000,
      });

      return NextResponse.json({
        success: cloneResult.success,
        output: cloneResult.output,
        message: cloneResult.success
          ? undefined
          : cloneResult.message || cloneResult.error,
      });
    }

    case "branches": {
      if (!path) {
        return NextResponse.json(
          { success: false, message: "Repository path is required." },
          { status: 400 },
        );
      }

      const branchesResult = await executeSshCommand({
        ...credentials,
        command: `git config --global --add safe.directory '*' && cd ${path} && git branch -a 2>/dev/null | sed 's/^[* ]*//' || echo "-"`,
      });

      if (!branchesResult.success) {
        return NextResponse.json(
          {
            success: false,
            message:
              branchesResult.message || branchesResult.error || "Failed to fetch branches.",
          },
          { status: 500 },
        );
      }

      const branches = branchesResult.output
        .split("\n")
        .map((b) => b.trim())
        .filter((b) => b && b !== "-");

      return NextResponse.json({ success: true, branches });
    }

    case "checkout": {
      if (!path || !branch) {
        return NextResponse.json(
          {
            success: false,
            message: "Repository path and branch are required.",
          },
          { status: 400 },
        );
      }

      // Run as user to preserve SSH agent access
      const checkoutResult = await executeSshCommand({
        ...credentials,
        command: `git config --global --add safe.directory '/var/www/${path.split("/").pop() || "repo"}' && cd ${path} && git checkout ${branch} 2>&1`,
      });

      return NextResponse.json({
        success: checkoutResult.success,
        output: checkoutResult.output,
        message: checkoutResult.success
          ? `Switched to branch ${branch}`
          : checkoutResult.message || checkoutResult.error,
      });
    }

    case "rename": {
      if (!path || !newName) {
        return NextResponse.json(
          {
            success: false,
            message: "Repository path and new name are required.",
          },
          { status: 400 },
        );
      }

      const parentDir = path.split("/").slice(0, -1).join("/");
      const newPath = `${parentDir}/${newName}`;

      const renameResult = await executeSudoCommand({
        ...credentials,
        command: `mv ${path} ${newPath} 2>&1`,
      });

      return NextResponse.json({
        success: renameResult.success,
        output: renameResult.output,
        message: renameResult.success
          ? `Repository renamed to ${newName}`
          : renameResult.message || renameResult.error,
      });
    }

    case "test-git": {
      const testResult = await executeSshCommand({
        ...credentials,
        command: "ssh -T git@github.com 2>&1 || true",
      });

      const output = testResult.output || "";
      const success = output.includes("successfully authenticated") || output.includes("Hi ");

      return NextResponse.json({
        success,
        output,
        message: success
          ? "Git SSH connection successful"
          : "Git SSH connection failed. Make sure SSH key is configured.",
      });
    }

    default:
      return NextResponse.json(
        { success: false, message: "Invalid action." },
        { status: 400 },
      );
  }
}
