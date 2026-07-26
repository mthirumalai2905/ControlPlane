"""Validation Engine — liveness + catalog tools; MCP handshake best-effort."""

from __future__ import annotations

import os
from dataclasses import dataclass, field

from hermes_types import ServerManifest

from hermes_api.models import InstalledServer
from hermes_api.services.execution_sandbox import ExecutionSandbox


@dataclass
class ValidationResult:
    passed: bool
    partial: bool = False
    health_score: float = 0.0
    reason: str = ""
    tiers: dict[str, bool] = field(default_factory=dict)
    tools: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "passed": self.passed,
            "partial": self.partial,
            "health_score": self.health_score,
            "reason": self.reason,
            "tiers": self.tiers,
            "tools": self.tools,
        }


def validate_server(
    sandbox: ExecutionSandbox,
    server: InstalledServer,
    manifest: ServerManifest,
    *,
    tools_hint: list[str] | None = None,
) -> ValidationResult:
    tiers: dict[str, bool] = {}
    tools = list(tools_hint or [])

    cid = server.container_id or ""
    if cid.startswith("pid:"):
        pid = int(cid.split(":", 1)[1])
        try:
            os.kill(pid, 0)
            alive = True
        except OSError:
            alive = False
    else:
        alive = bool(cid and sandbox.container_running(cid))

    tiers["process_alive"] = alive
    # Handshake: Phase 1 records catalog tools; live MCP SDK probe is optional follow-up
    tiers["mcp_handshake"] = bool(tools)
    tiers["functional_smoke"] = False
    tiers["tools_catalog"] = bool(tools)

    if not alive:
        return ValidationResult(
            passed=False,
            partial=False,
            health_score=0.0,
            reason="Process/container is not running",
            tiers=tiers,
            tools=tools,
        )

    score = 70.0 + (15.0 if tools else 0.0)
    return ValidationResult(
        passed=True,
        partial=not bool(tools),
        health_score=score,
        reason="Liveness OK" + ("; tools from catalog" if tools else "; tools pending live probe"),
        tiers=tiers,
        tools=tools,
    )
