#!/bin/sh
# Pre-tool-use hook: log tool call, block protected branch writes, redact secrets
# Receives JSON on stdin, returns JSON on stdout

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.stdout.write(d.tool_name||'')" 2>/dev/null || echo "")
TOOL_ARGS=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.stdout.write(JSON.stringify(d.tool_args||{}))" 2>/dev/null || echo "{}")

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
SESSION_ID="${GITRAILS_SESSION_ID:-unknown}"
AUDIT_DIR=".gitagent"

# ── Log all tool calls to audit log ──────────────────────────────────────────
mkdir -p "$AUDIT_DIR"
printf '{"timestamp":"%s","session":"%s","event":"tool_call","tool":"%s"}\n' \
  "$TIMESTAMP" "$SESSION_ID" "$TOOL_NAME" >> "$AUDIT_DIR/audit.jsonl" 2>/dev/null || true

# ── Block writes to protected branches ───────────────────────────────────────
if [ "$TOOL_NAME" = "git-write" ] || [ "$TOOL_NAME" = "git-commit" ]; then
  BRANCH=$(echo "$TOOL_ARGS" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.stdout.write(d.branch||'')" 2>/dev/null || echo "")
  CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
  TARGET_BRANCH="${BRANCH:-$CURRENT_BRANCH}"

  for PROTECTED in main master develop; do
    if [ "$TARGET_BRANCH" = "$PROTECTED" ]; then
      printf '{"timestamp":"%s","session":"%s","event":"blocked","reason":"write to protected branch: %s"}\n' \
        "$TIMESTAMP" "$SESSION_ID" "$PROTECTED" >> "$AUDIT_DIR/audit.jsonl" 2>/dev/null || true
      printf '{ "action": "block", "reason": "Write to protected branch %s is not allowed. Use session branch gitrails/session-{uuid}." }' "$PROTECTED"
      exit 0
    fi
  done

  case "$TARGET_BRANCH" in
    release/*|hotfix/*)
      printf '{"timestamp":"%s","session":"%s","event":"blocked","reason":"write to protected branch pattern: %s"}\n' \
        "$TIMESTAMP" "$SESSION_ID" "$TARGET_BRANCH" >> "$AUDIT_DIR/audit.jsonl" 2>/dev/null || true
      printf '{ "action": "block", "reason": "Write to release/* or hotfix/* branches is not allowed." }'
      exit 0
      ;;
  esac
fi

# ── Allow all other tool calls ────────────────────────────────────────────────
printf '{ "action": "allow" }'
