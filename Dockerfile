# HuggingFace Spaces entrypoint (free compute, no card).
# HF builds the repo root as context and routes HTTP to $PORT (7860).
# Everything else (local compose, Koyeb, Render) keeps using
# backend/Dockerfile.allinone - this file only adapts paths for root context.
FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt honcho

COPY backend/. /app/backend/
COPY backend/Procfile /app/Procfile
COPY backend/allinone-entrypoint.sh /app/allinone-entrypoint.sh
RUN chmod +x /app/allinone-entrypoint.sh

WORKDIR /app
ENV PYTHONPATH=/app
ENV PORT=7860
EXPOSE 7860

CMD ["/app/allinone-entrypoint.sh"]
