export interface ServerConnection {
  host: string;
  port: number;
  username: string;
  password: string;
  name?: string;
}

export const CONNECTION_KEY = "server-monitoring-connection";
