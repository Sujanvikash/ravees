# The shop API as one image. Built by CI (.github/workflows/ecommerce.yml) and run by ecommerce/deploy/compose.yml.
#   docker build -t shop-api ecommerce/backend

FROM python:3.13-slim AS build
COPY --from=ghcr.io/astral-sh/uv:0.8.22 /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never
WORKDIR /app
# the packages first, so a code-only change reuses this layer
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --frozen --no-dev --no-install-project
COPY app ./app
COPY migrations ./migrations
COPY alembic.ini ./
# the starting catalogue and its photos, read once by `python -m app.cli seed`
COPY seed ./seed

FROM python:3.13-slim
RUN useradd --create-home --uid 1000 shop
WORKDIR /app
COPY --from=build --chown=shop:shop /app /app
ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1 ENVIRONMENT=production
USER shop
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4)"
# Migrations run on every start, so a new image brings its tables with it.
# One worker only: the wrong-password brake is counted in memory. The proxy in front (Caddy) passes on the
# customer's real address.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --proxy-headers --forwarded-allow-ips='*'"]
