#!/bin/bash
set -e

# Clear stale runtime context from previous session
: > memory/runtime/context.md 2>/dev/null || true

# Load knowledge into session context (capped at 80 lines each)
for f in knowledge/patterns.md knowledge/false-positives.md knowledge/team-preferences.md; do
  [ -f "$f" ] && head -n 80 "$f" >> memory/runtime/context.md && echo "" >> memory/runtime/context.md || true
done

# Load code graph summary (first 40 lines — full graph is read per-skill as needed)
[ -f "knowledge/graph.json" ] && head -n 40 knowledge/graph.json >> memory/runtime/context.md || true

echo '{ "action": "allow" }'
