"""Package download / client-config export for installed MCP servers."""

from __future__ import annotations

import io
import json
import zipfile
from pathlib import Path
from uuid import UUID

from hermes_api.models import InstalledServer, RegistryEntry


def build_client_config(server: InstalledServer, entry: RegistryEntry) -> dict:
    """Claude Desktop / Cursor-compatible MCP server snippet."""
    methods = entry.install_methods or {}
    meta = methods.get("_meta") or {}
    env: dict[str, str] = {}
    for spec in meta.get("required_env") or []:
        env[spec["name"]] = f"<set-{spec['name']}>"

    npm = methods.get("npm")
    if npm:
        command = "npx"
        args = ["-y", npm]
        template = meta.get("start_args_template") or []
        for a in template:
            if a == "{{ALLOW_PATH}}":
                args.append(str(Path(server.install_path or "") / "data") if server.install_path else "/data")
            elif a.startswith("{{") and a.endswith("}}"):
                key = a[2:-2]
                args.append(f"${{{key}}}")
            else:
                args.append(a)
        if entry.slug == "filesystem" and "{{ALLOW_PATH}}" not in template:
            data = str(Path(server.config_dir_path or ".") / "data")
            args.append(data)
    elif methods.get("uvx"):
        command = "uvx"
        parts = methods["uvx"].split()
        args = parts[1:] if parts[0] == "uvx" else parts
    else:
        command = "npx"
        args = ["-y", entry.slug]

    return {
        "mcpServers": {
            entry.slug: {
                "command": command,
                "args": args,
                "env": env,
            }
        }
    }


def zip_server_package(
    server: InstalledServer,
    entry: RegistryEntry,
    *,
    include_source: bool = True,
) -> bytes:
    """Zip config dir + client config + optional cloned/downloaded source."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # Client config for Claude/Cursor
        client = build_client_config(server, entry)
        zf.writestr("mcp-client-config.json", json.dumps(client, indent=2))
        zf.writestr(
            "README-HERMES.txt",
            (
                f"Hermes export for {entry.name} ({entry.slug})\n"
                f"Status: {server.status}\n"
                f"Merge mcp-client-config.json into Claude Desktop or Cursor MCP settings.\n"
                f"Package: {(entry.install_methods or {}).get('npm') or entry.repo_url}\n"
            ),
        )

        config_dir = Path(server.config_dir_path) if server.config_dir_path else None
        if config_dir and config_dir.exists():
            for path in config_dir.rglob("*"):
                if path.is_file() and ".git" not in path.parts:
                    # skip secrets plaintext if any — .env may contain secrets; include as .env.example only
                    if path.name == ".env":
                        zf.writestr(
                            "config/.env.example",
                            "\n".join(
                                line.split("=", 1)[0] + "="
                                for line in path.read_text(encoding="utf-8", errors="ignore").splitlines()
                                if line.strip() and not line.strip().startswith("#")
                            )
                            + "\n",
                        )
                        continue
                    arc = f"config/{path.relative_to(config_dir).as_posix()}"
                    zf.write(path, arcname=arc)

        source_dir = None
        if config_dir:
            candidate = config_dir / "source"
            if candidate.exists():
                source_dir = candidate
        if include_source and source_dir and source_dir.exists():
            for path in source_dir.rglob("*"):
                if path.is_file() and "node_modules" not in path.parts and ".git" not in path.parts:
                    arc = f"source/{path.relative_to(source_dir).as_posix()}"
                    zf.write(path, arcname=arc)

        manifest = server.manifest or {}
        zf.writestr("hermes-manifest.json", json.dumps(manifest, indent=2))
        zf.writestr(
            "registry.json",
            json.dumps(
                {
                    "name": entry.name,
                    "slug": entry.slug,
                    "repo_url": entry.repo_url,
                    "install_methods": entry.install_methods,
                    "classification": entry.classification,
                },
                indent=2,
            ),
        )

    return buf.getvalue()


def registry_download_info(entry: RegistryEntry) -> dict:
    methods = entry.install_methods or {}
    return {
        "slug": entry.slug,
        "name": entry.name,
        "npm": methods.get("npm"),
        "npx": methods.get("npx"),
        "python": methods.get("python"),
        "uvx": methods.get("uvx"),
        "repo_url": entry.repo_url,
        "package_url": methods.get("package_url") or (methods.get("_meta") or {}).get("package_url"),
        "source_subdir": methods.get("source_subdir"),
        "install_command": methods.get("npx")
        or methods.get("uvx")
        or (f"npm i -g {methods['npm']}" if methods.get("npm") else None),
    }
