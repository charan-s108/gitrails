#!/bin/sh
set -e

echo "gitrails: loading memory..."
cat knowledge/patterns.md >> memory/runtime/context.md 2>/dev/null || true
cat knowledge/team-preferences.md >> memory/runtime/context.md 2>/dev/null || true
cat knowledge/false-positives.md >> memory/runtime/context.md 2>/dev/null || true

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
