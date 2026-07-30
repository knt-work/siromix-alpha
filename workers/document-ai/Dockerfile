FROM python:3.12.11-slim-bookworm AS build
WORKDIR /workspace
COPY --from=ghcr.io/astral-sh/uv:0.8.14 /uv /usr/local/bin/uv
COPY workers/document-ai workers/document-ai
RUN uv sync --frozen --no-dev --project workers/document-ai

FROM python:3.12.11-slim-bookworm AS runtime
ARG SOURCE_COMMIT=unknown
LABEL org.opencontainers.image.revision=$SOURCE_COMMIT
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/* && useradd --create-home --uid 10001 worker
WORKDIR /workspace
COPY --from=build --chown=worker:worker /workspace/workers/document-ai /workspace/workers/document-ai
ENV PATH="/workspace/workers/document-ai/.venv/bin:${PATH}"
ENV WORKER_HEALTH_PORT=3002
ENV WORKER_HEALTH_HOST=0.0.0.0
ENV SOURCE_COMMIT=$SOURCE_COMMIT
USER worker
EXPOSE 3002
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:3002/ready', timeout=2)"
CMD ["python", "-m", "siromix_worker.main"]
