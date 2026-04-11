# ─────────────────────────────────────────────────────────────────────────────
# gitrails — Dockerfile
#
# Multi-stage build:
#   stage 1 (deps)  — install Node.js production dependencies
#   stage 2 (final) — lean runtime image with git and Node.js
#
# Build:
#   docker build -t gitrails .
#
# Run:
#   docker run --rm \
#     -e GROQ_API_KEY="your-key" \
#     -e GITHUB_TOKEN="your-token" \
#     -e GITRAILS_MODEL="groq:llama-3.3-70b-versatile" \
#     -e GITRAILS_FALLBACK_MODEL="groq:llama-3.1-8b-instant" \
#     -v $(pwd):/workspace \
#     gitrails
#
# Switch models without rebuilding — just change GITRAILS_MODEL at runtime:
#   docker run --rm -e GROQ_API_KEY="..." -e GITRAILS_MODEL="groq:llama3-70b-8192" ...
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Node.js dependency installation ─────────────────────────────────
FROM node:20-slim AS deps

WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 2: Final runtime image ─────────────────────────────────────────────
FROM node:20-slim AS final

LABEL org.opencontainers.image.title="gitrails"
LABEL org.opencontainers.image.description="Self-aware, learning engineering teammate — gitagent standard v0.1.0"
LABEL org.opencontainers.image.authors="Charan S <charansrinivas108@gmail.com>"
LABEL org.opencontainers.image.url="https://github.com/charan-s108/gitrails"
LABEL org.opencontainers.image.licenses="MIT"

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g gitclaw

WORKDIR /app

COPY --from=deps /build/node_modules ./node_modules
COPY . .

# ── Retrieval layer cache ─────────────────────────────────────────────────────
# Pre-download the embedding model (~80MB) so the container starts immediately.
ENV TRANSFORMERS_CACHE=/app/.cache/huggingface
RUN node -e "
  import('@xenova/transformers').then(({ pipeline }) =>
    pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  ).then(() => {
    console.log('Embedding model cached.');
    process.exit(0);
  }).catch(e => {
    console.warn('Model pre-cache skipped (expected in offline builds):', e.message);
    process.exit(0);
  });
" || true

# ── Environment — no defaults for secrets or model ───────────────────────────
# GROQ_API_KEY, GITHUB_TOKEN, GITRAILS_MODEL, GITRAILS_FALLBACK_MODEL
# must all be provided at runtime via -e flags or a mounted .env file.
ENV GITRAILS_MAX_TURNS=50
ENV GITRAILS_TIMEOUT=120
ENV GITRAILS_RISK_THRESHOLD=0.3
ENV GITRAILS_AUDIT_RETENTION_DAYS=90
ENV GITRAILS_VECTOR_INDEX_PATH=/app/knowledge/vector-index
ENV GITRAILS_GRAPH_PATH=/app/knowledge/graph.json
ENV GITRAILS_EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
ENV GITRAILS_CHUNK_SIZE=512
ENV GITRAILS_CHUNK_OVERLAP=64
ENV GITRAILS_TOP_K=5
ENV NODE_ENV=production

# ── Volumes ───────────────────────────────────────────────────────────────────
VOLUME ["/workspace", "/app/knowledge/vector-index", "/app/.gitagent"]

# ── Healthcheck ───────────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('fs').existsSync('/app/agent.yaml') || process.exit(1)"

# ── Entrypoint ────────────────────────────────────────────────────────────────
ENTRYPOINT ["gitclaw", "--dir", "/app"]
CMD ["--prompt", "Run the gitrails demo flow on /workspace"]
