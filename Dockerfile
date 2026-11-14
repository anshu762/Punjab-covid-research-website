FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Create non-root system user
RUN useradd -u 1001 -m -s /bin/sh epilens

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/compute/app/ ./app/
COPY apps/compute/data/ ./data/

RUN chown -R epilens:epilens /app

# Ensure misconfigured PaaS start commands (like pnpm/npm) gracefully launch uvicorn
RUN printf '#!/bin/sh\nexec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"\n' > /usr/local/bin/pnpm \
    && chmod +x /usr/local/bin/pnpm \
    && ln -sf /usr/local/bin/pnpm /usr/local/bin/npm \
    && ln -sf /usr/local/bin/pnpm /usr/local/bin/npx \
    && ln -sf /usr/local/bin/pnpm /usr/local/bin/yarn

USER epilens

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request, os; port = os.environ.get('PORT', '8000'); urllib.request.urlopen(f'http://127.0.0.1:{port}/health', timeout=3)" || exit 1

CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
