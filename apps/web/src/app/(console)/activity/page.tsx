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
        <h1 className="font-display text-4xl">AI Activity Feed</h1>
        <p className="mt-2 text-mist-400">
          Tell Hermes what to connect — e.g. “Install the GitHub MCP” or “List installed servers”.
        </p>
      </header>

      <form
        className="panel rounded-lg p-4 flex flex-col sm:flex-row gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (message.trim() && workspace) chat.mutate();
        }}
      >
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder='Connect my Postgres MCP…'
          className="flex-1 rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={chat.isPending || !message.trim()}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-ink-950 disabled:opacity-40"
        >
          {chat.isPending ? "Working…" : "Ask Hermes"}
        </button>
      </form>
      {chat.isError && (
        <p className="text-sm text-signal-bad">{(chat.error as Error).message}</p>
      )}
      {chat.data?.summary && (
        <p className="text-sm text-mist-200 panel rounded-md px-4 py-3">{chat.data.summary}</p>
      )}

      <div className="space-y-4">
        {(tasks.data ?? []).map((task) => (
          <article key={task.id} className="panel rounded-lg p-5">
            <div className="flex justify-between gap-4 flex-wrap">
              <h2 className="font-medium">{task.intent}</h2>
              <span className="font-mono text-xs text-mist-400 uppercase">{task.status}</span>
            </div>
            {task.summary && <p className="text-sm text-mist-400 mt-2">{task.summary}</p>}
            {task.installed_server_id && (
              <Link
                href={`/servers/${task.installed_server_id}`}
                className="inline-block mt-2 text-sm text-accent hover:underline"
              >
                Open installed server →
              </Link>
            )}
            <ol className="mt-4 space-y-3 border-l border-ink-700 pl-4">
              {(task.steps ?? []).map((step) => (
                <li key={step.id}>
                  <p className="text-xs font-mono text-accent">
                    #{step.step_number} {step.tool_used ?? "reason"} · {step.outcome}
                    {step.duration_ms != null ? ` · ${step.duration_ms}ms` : ""}
                  </p>
                  <p className="text-sm text-mist-200 mt-0.5">{step.reasoning}</p>
                </li>
              ))}
            </ol>
          </article>
        ))}
        {(tasks.data ?? []).length === 0 && (
          <p className="text-mist-400 text-sm">No activity yet — connect a server or ask Hermes.</p>
        )}
      </div>
    </div>
  );
}
