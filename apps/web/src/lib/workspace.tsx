"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type Workspace } from "@/lib/api";

type Ctx = {
  workspace: Workspace | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const WorkspaceContext = createContext<Ctx>({
  workspace: null,
  loading: true,
  refresh: async () => {},
});

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      let list = await api.workspaces.list();
      if (list.length === 0) {
        await api.workspaces.create("Default");
        list = await api.workspaces.list();
      }
      setWorkspace(list[0] ?? null);
    } catch {
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <WorkspaceContext.Provider value={{ workspace, loading, refresh }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
