FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl \
    && rm -rf /var/lib/apt/lists/*

COPY packages/shared-types /packages/shared-types
COPY apps/api /app

RUN pip install --no-cache-dir /packages/shared-types \
    && pip install --no-cache-dir -e ".[dev]" \
    && pip install --no-cache-dir cryptography

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

CMD ["uvicorn", "hermes_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
