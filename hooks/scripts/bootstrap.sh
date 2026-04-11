#!/bin/sh
set -e

echo "gitrails: loading memory..."
# Clear runtime context for fresh session
: > memory/runtime/context.md 2>/dev/null || true

# Load knowledge files into context (capped to prevent context bloat)
head -n 80 knowledge/patterns.md >> memory/runtime/context.md 2>/dev/null || true
head -n 80 knowledge/team-preferences.md >> memory/runtime/context.md 2>/dev/null || true
head -n 80 knowledge/false-positives.md >> memory/runtime/context.md 2>/dev/null || true

echo "gitrails: checking vector index..."
if [ ! -f "knowledge/vector-index/index.json" ]; then
  echo "gitrails: building vector index (first run, ~60s)..."
  node retrieval/index.js --build --root ./
fi

echo "gitrails: checking code graph..."
if [ ! -f "knowledge/graph.json" ] || [ "$(cat knowledge/graph.json)" = "{}" ]; then
  echo "gitrails: building code graph..."
  node retrieval/graph.js --build --root ./
fi

echo "gitrails: bootstrap complete"
printf '{ "action": "allow" }'
