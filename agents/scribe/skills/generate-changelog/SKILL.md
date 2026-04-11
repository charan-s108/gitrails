---
name: generate-changelog
description: "Generates a CHANGELOG.md entry for the current PR describing user-facing behavioral changes. Based on the actual diff, not the PR description alone."
license: MIT
allowed-tools: Read Write cli audit-log
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "documentation"
  risk_tier: "low"
---

# generate-changelog

From dispatch plan metadata and changed public API surfaces, categorize changes as Added/Changed/Fixed/Removed/Security/Breaking. Read CHANGELOG.md, prepend new entry in Keep-a-Changelog format. Commit to session branch. Skip if verdict is BLOCKED.
