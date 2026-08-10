import { Client } from "ssh2";

export interface SshCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
}

interface ExecuteOptions extends SshCredentials {
  command: string;
  timeout?: number;
}

interface ExecuteSudoOptions extends SshCredentials {
  command: string;
  timeout?: number;
}

export interface ExecuteResult {
  success: boolean;
  output: string;
  error: string;
  message?: string;
}

export async function executeSshCommand({
  host,
  port,
  username,
  password,
  command,
  timeout = 30000,
}: ExecuteOptions): Promise<ExecuteResult> {
  return new Promise((resolve) => {
    const conn = new Client();
    let output = "";
    let errorOutput = "";
    let finished = false;

    const finish = (result: ExecuteResult) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      try {
        conn.end();
      } catch {
        // Ignore errors when closing connection.
      }
      resolve(result);
    };

    const timeoutId = setTimeout(() => {
      finish({
        success: false,
        output,
        error: errorOutput,
        message: "Command timed out.",
      });
    }, timeout);

    conn
      .on("ready", () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            finish({
              success: false,
              output,
              error: errorOutput,
              message: err.message || "Failed to execute command.",
            });
            return;
          }

          stream
            .on("close", (code: number | null) => {
              finish({
                success: code === 0 || code === null,
                output: output.trim(),
                error: errorOutput.trim(),
                message:
                  code !== 0 && code !== null
                    ? errorOutput.trim() || "Command failed."
                    : undefined,
              });
            })
            .on("data", (data: Buffer) => {
              output += data.toString();
            })
            .stderr.on("data", (data: Buffer) => {
              errorOutput += data.toString();
            });
        });
      })
      .on("error", (err: Error) => {
        const message = err.message.includes("ECONNREFUSED")
          ? "Connection refused. Please check the host and port."
          : err.message.includes("ECONNRESET")
          ? "Connection reset. Please verify the server is reachable."
          : err.message.includes("authentication")
          ? "Authentication failed. Please check the username and password."
          : err.message || "Failed to connect to the server.";
        finish({ success: false, output, error: errorOutput, message });
      })
      .connect({
        host,
        port,
        username,
        password,
        readyTimeout: timeout,
        keepaliveInterval: 0,
      });
  });
}

export async function executeSudoCommand({
  host,
  port,
  username,
  password,
  command,
  timeout = 30000,
}: ExecuteSudoOptions): Promise<ExecuteResult> {
  return new Promise((resolve) => {
    const conn = new Client();
    let output = "";
    let errorOutput = "";
    let finished = false;

    const finish = (result: ExecuteResult) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      try {
        conn.end();
      } catch {
        // Ignore errors when closing connection.
      }
      resolve(result);
    };

    const timeoutId = setTimeout(() => {
      finish({
        success: false,
        output,
        error: errorOutput,
        message: "Command timed out.",
      });
    }, timeout);

    conn
      .on("ready", () => {
        conn.exec(`sudo -S -p '' bash -c ${JSON.stringify(command)}`, (err, stream) => {
          if (err) {
            finish({
              success: false,
              output,
              error: errorOutput,
              message: err.message || "Failed to execute command.",
            });
            return;
          }

          stream
            .on("close", (code: number | null) => {
              finish({
                success: code === 0 || code === null,
                output: output.trim(),
                error: errorOutput.trim(),
                message:
                  code !== 0 && code !== null
                    ? errorOutput.trim() || "Command failed."
                    : undefined,
              });
            })
            .on("data", (data: Buffer) => {
              output += data.toString();
            })
            .stderr.on("data", (data: Buffer) => {
              errorOutput += data.toString();
            });

          stream.write(`${password}\n`);
          stream.end();
        });
      })
      .on("error", (err: Error) => {
        const message = err.message.includes("ECONNREFUSED")
          ? "Connection refused. Please check the host and port."
          : err.message.includes("ECONNRESET")
          ? "Connection reset. Please verify the server is reachable."
          : err.message.includes("authentication")
          ? "Authentication failed. Please check the username and password."
          : err.message || "Failed to connect to the server.";
        finish({ success: false, output, error: errorOutput, message });
      })
      .connect({
        host,
        port,
        username,
        password,
        readyTimeout: timeout,
        keepaliveInterval: 0,
      });
  });
}

export async function executeSudoDockerCommand(
  credentials: SshCredentials,
  dockerArgs: string,
  timeout?: number
): Promise<ExecuteResult> {
  return executeSudoCommand({
    ...credentials,
    command: `docker ${dockerArgs}`,
    timeout,
  });
}
