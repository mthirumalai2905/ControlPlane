"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";

export default function ActivityPage() {
  const { workspace } = useWorkspace();
  const [message, setMessage] = useState("");
  const qc = useQueryClient();

  const tasks = useQuery({
    queryKey: ["tasks", workspace?.id],
    queryFn: () => api.tasks.list(workspace!.id),
    enabled: !!workspace?.id,
    refetchInterval: 4000,
  });

  const chat = useMutation({
    mutationFn: () => api.chat(workspace!.id, message),
    onSuccess: () => {
      setMessage("");
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      void qc.invalidateQueries({ queryKey: ["servers"] });
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl text-[#1a2218]">AI Activity Feed</h1>
        <p className="mt-2 text-[#5c6b58]">
          Commands: Install GitHub · Repair Slack · Restart Browser · Update GitHub · Show unhealthy
          connectors · List installed connectors
        </p>
      </header>

      <form
        className="panel flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center"
        onSubmit={(e) => {
          e.preventDefault();
          if (message.trim() && workspace) chat.mutate();
        }}
      >
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Install PostgreSQL…"
          className="console-input flex-1"
        />
        <button
          type="submit"
          disabled={chat.isPending || !message.trim()}
          className="console-btn-accent shrink-0"
        >
          {chat.isPending ? "Working…" : "Ask Control Plane"}
        </button>
      </form>
      {chat.isError && (
        <p className="text-sm text-[#8b3a3a]">{(chat.error as Error).message}</p>
      )}
      {chat.data?.summary && (
        <p className="panel rounded-xl px-4 py-3 text-sm text-[#5c6b58]">{chat.data.summary}</p>
      )}

      <div className="space-y-4">
        {(tasks.data ?? []).map((task) => (
          <article key={task.id} className="panel rounded-xl p-5">
            <div className="flex flex-wrap justify-between gap-4">
              <h2 className="font-medium text-[#1a2218]">{task.intent}</h2>
              <span className="font-mono text-xs uppercase text-[#8a9a84]">{task.status}</span>
            </div>
            {task.summary && <p className="mt-2 text-sm text-[#5c6b58]">{task.summary}</p>}
            {task.installed_server_id && (
              <Link
                href={`/servers/${task.installed_server_id}`}
                className="mt-2 inline-block text-sm text-[#2f5d3a] hover:underline"
              >
                Open installed connector →
              </Link>
            )}
            <ol className="mt-4 space-y-3 border-l-2 border-[#2f5d3a]/30 pl-4">
              {(task.steps ?? []).map((step) => (
                <li key={step.id}>
                  <p className="font-mono text-xs text-[#2f5d3a]">
                    #{step.step_number} {step.tool_used ?? "reason"} · {step.outcome}
                    {step.duration_ms != null ? ` · ${step.duration_ms}ms` : ""}
                  </p>
                  <p className="mt-0.5 text-sm text-[#5c6b58]">{step.reasoning}</p>
                </li>
              ))}
            </ol>
          </article>
        ))}
        {(tasks.data ?? []).length === 0 && (
          <p className="text-sm text-[#5c6b58]">No activity yet — connect a connector or ask Control Plane.</p>
        )}
      </div>
    </div>
  );
}
