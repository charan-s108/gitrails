---
name: document-module
description: "Adds JSDoc or Google-style docstrings to changed public functions that lack documentation. Never documents behavior not present in the code."
license: MIT
allowed-tools: read write cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "documentation"
  risk_tier: "low"
---

# document-module

1. Read `../../knowledge/graph.json` — get function names and line ranges for each changed file.
2. For each public function: read 5 lines before it to check for existing `/**` or `"""` — skip if documented.
3. Skip: private (`_prefix`, `#`), trivial under 3 lines, or unchanged functions.
4. Read the function body. Write JSDoc (`@param`, `@returns`, `@throws`) or Google docstring based only on what the code does.
5. Write updated file. Commit: `docs: jsdoc for {module} via gitrails/session-{uuid}`.
