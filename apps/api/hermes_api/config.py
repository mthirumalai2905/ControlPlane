from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://hermes:hermes@localhost:5432/hermes"
    database_url_sync: str = "postgresql://hermes:hermes@localhost:5432/hermes"
    redis_url: str = "redis://localhost:6379/0"
    hermes_home: str = str(Path.home() / ".hermes")
    api_cors_origins: str = "http://localhost:3000"
    docker_network_prefix: str = "hermes"
    # Phase 0: allow host Docker; production should use rootless
    docker_enabled: bool = True

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.api_cors_origins.split(",") if o.strip()]

    @property
    def servers_root(self) -> Path:
        return Path(self.hermes_home).expanduser() / "servers"


@lru_cache
def get_settings() -> Settings:
    return Settings()
