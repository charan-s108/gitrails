---
name: document-module
description: "Adds JSDoc or docstrings to changed functions that lack documentation. Reads implementation before writing. Never documents behavior not present in the code."
license: MIT
allowed-tools: Read Write cli audit-log
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "documentation"
  risk_tier: "low"
---

# document-module

For each changed function: check if /** or """ exists in the 5 lines before it. If not, read the function body and write accurate JSDoc/docstring based only on what the code actually does. Skip private functions (_prefix) and trivial functions under 3 lines. Commit to session branch only.
