---
name: document-module
description: "Adds JSDoc or docstrings to changed functions that lack documentation. Reads implementation before writing. Never documents behavior not present in the code."
license: MIT
allowed-tools: read write cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "documentation"
  risk_tier: "low"
---

# document-module

## Purpose

For each changed function in the PR diff, checks whether documentation
exists. If not, reads the implementation and writes accurate JSDoc/docstrings.
Never invents behavior. Never describes error handling that isn't implemented.

## Token Budget

Always use semantic-search BEFORE git-read. Never read full files.

Step 1 — Get changed function list:
  Read `knowledge/graph.json` — get function names and line ranges for changed files.

Step 2 — Read only the function implementation:
  For each function: read its line range plus 5 lines before (to check for existing docs).
  If `/**` or `"""` found in preceding lines → skip (already documented).

Rule: Never read an entire file. Read only function implementations.
One read per function. Total reads bounded by number of changed functions.

## Instructions

1. Read `knowledge/graph.json` — get function list and line ranges for each changed file.
2. For each function:
   a. Read 5 lines before the function start → check for existing `/**` or `"""`
   b. If documented already → skip
   c. If under 3 lines (trivial) → skip
   d. If private (`_prefix`, `#`) → add brief one-line comment only
3. For each undocumented public function:
   a. Read the function's line range to understand its implementation
   b. Analyze: parameters (names + types), return value, error conditions
   c. Write JSDoc/docstring based ONLY on what the code does
4. Write updated file with `write` tool
5. Commit message: `docs: add jsdoc to {module} via gitrails/session-{uuid}`

## Documentation Templates

### JavaScript/TypeScript (JSDoc)
```javascript
/**
 * Validates a user by ID and returns the user record.
 *
 * @param {string} userId - The user's unique identifier
 * @param {Object} [options] - Optional configuration
 * @param {boolean} [options.includeProfile=false] - Include profile data in response
 * @returns {Promise<User|null>} The user record, or null if not found
 * @throws {ValidationError} If userId is null or undefined
 */
```

### Python (Google-style docstring)
```python
def validate_user(user_id: str, options: dict = None) -> Optional[User]:
    """Validates a user by ID and returns the user record.

    Args:
        user_id: The user's unique identifier.
        options: Optional configuration dict. Supports 'include_profile' key.

    Returns:
        User record if found, None if user does not exist.

    Raises:
        ValidationError: If user_id is None or empty string.
    """
```

## Output Format

```json
{
  "skill": "document-module",
  "agent": "scribe",
  "functions_documented": [
    {
      "function": "validateUser",
      "file": "src/auth/login.js",
      "line": 12,
      "doc_type": "jsdoc"
    }
  ],
  "functions_skipped": [
    {
      "function": "_hashPassword",
      "reason": "private function"
    }
  ],
  "commit": "docs: add jsdoc to auth/login.js via gitrails/session-f3a9b2c1"
}
```
