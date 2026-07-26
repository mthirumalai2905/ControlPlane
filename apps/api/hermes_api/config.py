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
    # Agent contest harness
    tavily_api_key: str = ""
    firecrawl_api_key: str = ""
    # Free open-source metasearch (self-hosted). Example: http://localhost:8080
    searxng_base_url: str = "http://localhost:8080"
    deepseek_api_key: str = ""
    llm_base_url: str = "https://api.deepseek.com"
    llm_model: str = "deepseek-chat"
    # Default research provider: tavily | firecrawl | searxng
    search_provider: str = "tavily"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.api_cors_origins.split(",") if o.strip()]

    @property
    def servers_root(self) -> Path:
        return Path(self.hermes_home).expanduser() / "servers"


@lru_cache
def get_settings() -> Settings:
    return Settings()
