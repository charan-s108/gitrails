# ─────────────────────────────────────────────────────────────────────────────
# gitrails — Dockerfile
#
# Multi-stage build:
#   stage 1 (deps)  — install Node.js production dependencies
#   stage 2 (final) — lean runtime image with git, Node.js, and Python hooks
#
# Build:
#   docker build -t gitrails .
#
# Run:
#   docker run --rm \
#     -e GOOGLE_API_KEY="your-key" \
#     -e GITHUB_TOKEN="your-token" \
#     -v $(pwd):/workspace \
#     gitrails
#
# Run with a specific repo (gitclaw local repo mode):
#   docker run --rm \
#     -e GOOGLE_API_KEY="your-key" \
#     -e GITHUB_TOKEN="your-token" \
#     gitrails \
#     gitclaw --dir /app --repo https://github.com/org/repo "Review PR #42"
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Node.js dependency installation ─────────────────────────────────
FROM node:20-slim AS deps

WORKDIR /build

# Copy only package files first — maximise layer cache
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# ── Stage 2: Final runtime image ─────────────────────────────────────────────
FROM node:20-slim AS final

# Metadata
LABEL org.opencontainers.image.title="gitrails"
LABEL org.opencontainers.image.description="Self-aware, learning engineering teammate — gitagent standard v0.1.0"
LABEL org.opencontainers.image.authors="Charan S <charansrinivas108@gmail.com>"
LABEL org.opencontainers.image.url="https://github.com/charan-s108/gitrails"
LABEL org.opencontainers.image.licenses="MIT"

# Install system dependencies
# - git: required for all git operations in gitclaw
# - python3 + pip: required for hook scripts (requirements.txt)
# - ca-certificates: HTTPS calls to GitHub API and Google AI Studio
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    python3 \
    python3-pip \
    python3-venv \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install gitclaw globally
RUN npm install -g gitclaw

WORKDIR /app

# Copy Node.js production deps from build stage
COPY --from=deps /build/node_modules ./node_modules

# Copy all agent files
COPY . .

# Install Python dependencies for hook scripts
RUN python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir --upgrade pip && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# Add venv to PATH so hook scripts can use Python tools directly
ENV PATH="/opt/venv/bin:$PATH"

# ── Retrieval layer cache ─────────────────────────────────────────────────────
# Pre-download the embedding model so container starts immediately
# without an 80MB download on first use.
# The model is cached to a named volume at /app/.cache/huggingface
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

# ── Environment defaults ──────────────────────────────────────────────────────
# These are overridden at runtime via -e flags or a mounted .env file.
# GOOGLE_API_KEY and GITHUB_TOKEN must always be provided at runtime.
ENV GITRAILS_MODEL=google:gemini-2.5-flash
ENV GITRAILS_FALLBACK_MODEL=google:gemini-2.5-flash-lite
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
# /workspace  — mount the repo under review here
# /app/knowledge/vector-index — persist the vector index across runs
# /app/.gitagent — persist audit logs across runs
VOLUME ["/workspace", "/app/knowledge/vector-index", "/app/.gitagent"]

# ── Healthcheck ───────────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('fs').existsSync('/app/agent.yaml') || process.exit(1)"

# ── Entrypoint ────────────────────────────────────────────────────────────────
# Default: start an interactive gitclaw session against /workspace
# Override CMD to run a specific task — see examples at top of file
ENTRYPOINT ["gitclaw", "--dir", "/app"]
CMD ["--prompt", "Explain this project and run the gitrails demo flow"]
