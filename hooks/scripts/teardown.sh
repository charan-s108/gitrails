#!/bin/sh
# Teardown hook: git reset on error, clear runtime state

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
SESSION_ID="${GITRAILS_SESSION_ID:-unknown}"
AUDIT_DIR=".gitagent"
TEARDOWN_REASON="${GITRAILS_TEARDOWN_REASON:-clean}"

echo "gitrails: teardown starting (reason: $TEARDOWN_REASON)..."

# ── On error: reset working directory ────────────────────────────────────────
if [ "$TEARDOWN_REASON" = "error" ] || [ "$TEARDOWN_REASON" = "timeout" ]; then
  echo "gitrails: error teardown — resetting working directory..."
  git reset --hard HEAD 2>/dev/null || true
  git clean -fd 2>/dev/null || true

  mkdir -p "$AUDIT_DIR"
  printf '{"timestamp":"%s","session":"%s","event":"error_teardown","reason":"%s"}\n' \
    "$TIMESTAMP" "$SESSION_ID" "$TEARDOWN_REASON" >> "$AUDIT_DIR/audit.jsonl" 2>/dev/null || true

  echo "gitrails: partial findings preserved in memory/runtime/dailylog.md"
fi

# ── Clear session-scoped runtime state ───────────────────────────────────────
echo "gitrails: clearing runtime context..."
cat > memory/runtime/context.md << 'EOF'
# Runtime Context

> Session-scoped. Cleared at teardown. Do not commit.
> Populated at bootstrap from knowledge/ files.

## Loaded Knowledge

<!-- bootstrap.sh populates this from knowledge/*.md -->

## Current Session

- session_id: (set at bootstrap)
- pr_number: (set at dispatch)
- branch: (set at dispatch)
- started_at: (set at bootstrap)
EOF

# ── Log session end ───────────────────────────────────────────────────────────
mkdir -p "$AUDIT_DIR"
printf '{"timestamp":"%s","session":"%s","event":"session_end","reason":"%s"}\n' \
  "$TIMESTAMP" "$SESSION_ID" "$TEARDOWN_REASON" >> "$AUDIT_DIR/audit.jsonl" 2>/dev/null || true

echo "gitrails: teardown complete"
printf '{ "action": "allow" }'
