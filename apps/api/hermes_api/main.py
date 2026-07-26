from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from hermes_api.config import get_settings
from hermes_api.routes import api_router


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Hermes Control Plane",
        description="AI-native MCP infrastructure platform — Phase 0 foundation",
        version="0.1.0",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router)
    return app


app = create_app()
