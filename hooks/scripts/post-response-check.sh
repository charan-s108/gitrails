#!/bin/sh
# Post-response hook: validate no raw secrets in output, check scope compliance
# Receives JSON on stdin, returns JSON on stdout

INPUT=$(cat)
RESPONSE=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.stdout.write(d.response||'')" 2>/dev/null || echo "")
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
SESSION_ID="${GITRAILS_SESSION_ID:-unknown}"
AUDIT_DIR=".gitagent"

# ── Check for raw secrets in response ────────────────────────────────────────
VIOLATION=""

echo "$RESPONSE" | grep -qE 'AKIA[0-9A-Z]{16}' 2>/dev/null && VIOLATION="AWS access key detected"
echo "$RESPONSE" | grep -qE 'sk_live_[a-zA-Z0-9]{24}' 2>/dev/null && VIOLATION="Stripe live key detected"
echo "$RESPONSE" | grep -qE 'ghp_[a-zA-Z0-9]{36}' 2>/dev/null && VIOLATION="GitHub token detected"
echo "$RESPONSE" | grep -qE 'AIza[0-9A-Za-z_-]{35}' 2>/dev/null && VIOLATION="Google API key detected"
echo "$RESPONSE" | grep -qF 'BEGIN RSA PRIVATE KEY' 2>/dev/null && VIOLATION="RSA private key detected"
echo "$RESPONSE" | grep -qF 'BEGIN EC PRIVATE KEY' 2>/dev/null && VIOLATION="EC private key detected"

if [ -n "$VIOLATION" ]; then
  mkdir -p "$AUDIT_DIR"
  printf '{"timestamp":"%s","session":"%s","event":"secret_in_output","detail":"%s"}\n' \
    "$TIMESTAMP" "$SESSION_ID" "$VIOLATION" >> "$AUDIT_DIR/audit.jsonl" 2>/dev/null || true
  printf '{ "action": "block", "reason": "%s in response output. Redact before proceeding." }' "$VIOLATION"
  exit 0
fi

# ── Log clean response ────────────────────────────────────────────────────────
mkdir -p "$AUDIT_DIR"
printf '{"timestamp":"%s","session":"%s","event":"response_clean"}\n' \
  "$TIMESTAMP" "$SESSION_ID" >> "$AUDIT_DIR/audit.jsonl" 2>/dev/null || true

printf '{ "action": "allow" }'
