from fastapi import APIRouter

from hermes_api.routes import incidents, servers, workspaces
from hermes_api.schemas import HealthResponse

api_router = APIRouter(prefix="/api/v1")
# Mount domain routers (paths are absolute under /api/v1)
api_router.include_router(servers.router)
api_router.include_router(workspaces.router)
api_router.include_router(incidents.router)


@api_router.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse()
