# Service packages

Phase 0 implements registry/installer/configurator/validator/execution-sandbox inside
`apps/api/hermes_api/services/`. These directories mark future independently deployable
Celery worker pools / FastAPI sub-apps per §3.3.
