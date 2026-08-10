"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
}

interface ServerContextValue {
  servers: Server[];
  selectedServer: Server | null;
  setSelectedServerId: (id: string) => void;
}

const ServerContext = createContext<ServerContextValue | undefined>(undefined);

const STORAGE_KEY = "server-monitoring-selected-server";

// TODO: Replace with actual server list fetched from the backend.
const MOCK_SERVERS: Server[] = [
  { id: "srv-1", name: "Production", host: "147.93.107.249", port: 6531 },
  { id: "srv-2", name: "BE Staging & UAT", host: "194.233.93.234", port: 2232 },
  { id: "srv-3", name: "FE Staging & UAT", host: "185.227.135.32", port: 2212 },
];

export function ServerProvider({ children }: { children: ReactNode }) {
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const storedId = sessionStorage.getItem(STORAGE_KEY);
    const fallback =
      MOCK_SERVERS.find((s) => s.id === storedId) ?? MOCK_SERVERS[0] ?? null;
    setSelectedServer(fallback);
    setIsReady(true);
  }, []);

  const setSelectedServerId = (id: string) => {
    const server = MOCK_SERVERS.find((s) => s.id === id) ?? null;
    setSelectedServer(server);
    if (server) {
      sessionStorage.setItem(STORAGE_KEY, server.id);
    }
  };

  return (
    <ServerContext.Provider
      value={{
        servers: MOCK_SERVERS,
        selectedServer,
        setSelectedServerId,
      }}
    >
      {isReady ? children : null}
    </ServerContext.Provider>
  );
}

export function useServer() {
  const context = useContext(ServerContext);
  if (!context) {
    throw new Error("useServer must be used within a ServerProvider");
  }
  return context;
}
