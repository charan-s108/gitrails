#!/bin/bash
# Drain stdin — gitclaw writes session data to hook stdin; must read before exiting
INPUT=$(cat)

# Clear stale runtime context from previous session
: > memory/runtime/context.md 2>/dev/null || true

printf '{ "action": "allow" }'
