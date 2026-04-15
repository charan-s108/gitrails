#!/bin/bash
set -e

# Clear stale runtime context from previous session
: > memory/runtime/context.md 2>/dev/null || true

echo '{ "action": "allow" }'
