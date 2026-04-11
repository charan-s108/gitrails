#!/bin/sh
set -e

echo "gitrails: loading memory..."

# Memory caps — each knowledge file is capped at 80 lines (≈1.5K tokens) before
# injecting into context. Prevents unbounded growth from blowing the session budget.
# To add more context: add to the file, it gets summarised on first 80 lines.
load_capped() {
  file="$1"
  if [ -f "$file" ]; then
    head -n 80 "$file" >> memory/runtime/context.md
    echo "" >> memory/runtime/context.md
  fi
}

# Clear stale runtime context from previous session
: > memory/runtime/context.md 2>/dev/null || true

load_capped knowledge/patterns.md
load_capped knowledge/team-preferences.md
load_capped knowledge/false-positives.md

echo "gitrails: checking vector index..."
if [ ! -f "knowledge/vector-index/index.json" ]; then
  echo "gitrails: building vector index (first run, ~60s)..."
  node retrieval/index.js --build --root ./
else
  echo "gitrails: vector index present (incremental updates on scan)"
fi

echo "gitrails: checking code graph..."
if [ ! -f "knowledge/graph.json" ] || [ "$(cat knowledge/graph.json)" = "{}" ]; then
  echo "gitrails: building code graph..."
  node retrieval/graph.js --build --root ./
fi

echo "gitrails: bootstrap complete"
printf '{ "action": "allow" }'
