---
name: suggest-tests
description: "Identifies changed functions without test coverage and suggests specific test cases. Uses semantic search to find test files and code graph to enumerate changed functions."
license: MIT
allowed-tools: Read cli audit-log
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "review"
  risk_tier: "low"
---

# suggest-tests

## Purpose

For each function changed in the PR diff, checks whether a corresponding
test exists and whether the tests cover the key edge cases. Suggests concrete,
specific test cases — not generic "add more tests" advice.

## Token Budget

Always use semantic-search BEFORE git-read. Never read full files.

Step 1 — Find existing test files:
  cli: node retrieval/index.js --query "test describe it expect jest vitest mocha"
  → returns JSON [{ file, start_line, end_line, score }]

Step 2 — Read only the returned line range:
  cli: sed -n '<start_line>,<end_line>p' <file>
  → check what test cases exist

Step 3 — Use code graph for function inventory:
  cli: node retrieval/graph.js --functions <changedFile>
  → returns JSON list of function names — zero file reads needed

Rule: Never read entire test files. Query and read only relevant ranges.

## Instructions

1. Get changed functions: `cli: node retrieval/graph.js --functions <file>` for each changed file
2. For each changed function:
   a. Search for tests: `cli: node retrieval/index.js --query "test {functionName} describe it"`
   b. If no test file found (score < 0.5) → mark as UNTESTED
   c. If test file found → `cli: sed -n '<start>,<end>p' <file>`
   d. Analyze: which edge cases are tested? What's missing?
3. For UNTESTED functions:
   - Generate 3-5 specific test case descriptions
   - Include: happy path, null input, error case, boundary condition
4. For PARTIALLY TESTED functions:
   - List the specific missing cases
5. Return test_coverage_gap score for score-risk

## Test Suggestion Format

For each untested or partially-tested function:

```markdown
### `validateUser(userId, options)`
**Status**: UNTESTED — no test file found
**Test coverage gap score**: 0.9

**Suggested test cases**:
1. `should return user object when valid userId provided`
2. `should return null when userId does not exist in database`
3. `should throw ValidationError when userId is null or undefined`
4. `should respect options.includeProfile flag`
5. `should handle database timeout gracefully`
```

## Output Format

```json
{
  "skill": "suggest-tests",
  "agent": "reviewer",
  "test_coverage_gap": 0.8,
  "functions_analyzed": [
    {
      "function": "validateUser",
      "file": "src/auth/login.js",
      "line": 12,
      "status": "untested",
      "suggested_tests": [
        "should return user when valid ID provided",
        "should return null for unknown user ID",
        "should throw on null userId"
      ]
    }
  ],
  "files_with_tests": ["src/auth/login.test.js"],
  "files_without_tests": ["src/auth/config.js"]
}
```
