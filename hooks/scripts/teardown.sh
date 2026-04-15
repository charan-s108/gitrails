#!/bin/bash
# Drain stdin — gitclaw writes error context to hook stdin; must read before exiting
INPUT=$(cat)

TEARDOWN_REASON="${GITRAILS_TEARDOWN_REASON:-clean}"

if [ "$TEARDOWN_REASON" = "error" ] || [ "$TEARDOWN_REASON" = "timeout" ]; then
  git reset --hard HEAD 2>/dev/null || true
fi

: > memory/runtime/context.md 2>/dev/null || true

printf '{ "action": "allow" }'
