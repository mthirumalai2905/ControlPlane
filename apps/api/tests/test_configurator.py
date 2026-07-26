"""Unit tests for Configuration Engine — pure function (§4.6, §12)."""

from hermes_types import EnvVarSpec, HealthCheckSpec, ServerManifest

from hermes_api.services.configurator import generate_config, write_config


def test_generate_config_writes_env_and_json(tmp_path):
    manifest = ServerManifest(
        install_method="docker",
        install_command="docker pull example",
        start_command="docker run example",
        required_env_vars=[
            EnvVarSpec(name="API_KEY", purpose="API key", secret=True),
            EnvVarSpec(name="REGION", purpose="Region", secret=False, default="us"),
        ],
        auth_type="api_key",
        default_port=9000,
        health_check=HealthCheckSpec(kind="mcp_ping"),
        docker_image="example:latest",
    )
    generated = generate_config(
        manifest,
        server_id="abc",
        secrets={"API_KEY": "secret-value"},
    )
    assert '"server_id": "abc"' in generated.config_json
    assert "API_KEY=secret-value" in generated.env_file
    assert "REGION=us" in generated.env_file
    assert "example:latest" in generated.docker_compose

    write_config(tmp_path, generated)
    assert (tmp_path / "config.json").exists()
    assert (tmp_path / ".env").exists()
    assert (tmp_path / "docker-compose.yml").exists()
    assert (tmp_path / "logs").is_dir()


def test_generate_config_idempotent_shape():
    manifest = ServerManifest(
        install_method="npm",
        install_command="npm i -g @x/y",
        start_command="npx @x/y",
        auth_type="none",
    )
    a = generate_config(manifest, server_id="s1")
    b = generate_config(manifest, server_id="s1")
    assert a == b
