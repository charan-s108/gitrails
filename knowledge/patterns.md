# Detection Patterns

> Active detection rules for gitrails.
> Updated via human-approved mirror PRs only.
> Loaded at bootstrap into runtime context.

## Credential Patterns

### hardcoded-api-key
- pattern: `AKIA[0-9A-Z]{16}` (AWS Access Key)
- severity: CRITICAL
- owasp: A07
- scope: `**/*`
- exclude: `.env.example`, `__mocks__/**`, `*.test.*`

### hardcoded-generic-secret
- pattern: `(?:password|secret|token|key)\s*=\s*["'][^"']{8,}["']`
- severity: HIGH
- owasp: A07
- scope: `**/*.{js,ts,py,go,java}`
- exclude: `.env.example`, `**/*.test.*`, `**/*.spec.*`

## Injection Patterns

### sql-concatenation
- pattern: `["'] \+.*(?:userId|username|email|input|param|req\.body|req\.query)`
- severity: HIGH
- owasp: A03
- scope: `**/*.{js,ts,py}`

### eval-injection
- pattern: `eval\s*\(` or `exec\s*\(`
- severity: HIGH
- owasp: A03
- scope: `**/*.{js,ts,py}`

### shell-injection
- pattern: `shell\s*=\s*True` or `innerHTML\s*=`
- severity: HIGH
- owasp: A03
- scope: `**/*.{js,ts,py}`

## Cryptography Patterns

### weak-hash
- pattern: `(?:md5|sha1)\s*\(`
- severity: HIGH
- owasp: A02
- scope: `**/*.{js,ts,py}`
- note: Flag only when used for passwords/credentials, not checksums

### weak-random
- pattern: `Math\.random\s*\(\)`
- severity: MEDIUM
- owasp: A07
- scope: `**/*.{js,ts}`
- note: Flag only in auth/token/session context

## Misconfiguration Patterns

### debug-enabled
- pattern: `DEBUG\s*=\s*[Tt]rue` or `debug:\s*true`
- severity: MEDIUM
- owasp: A05
- scope: `**/*.{js,ts,py,yaml,json}`
- exclude: `**/*.test.*`, `**/*.spec.*`, `**/*.dev.*`

### cors-wildcard
- pattern: `Access-Control-Allow-Origin.*\*`
- severity: MEDIUM
- owasp: A05
- scope: `**/*.{js,ts,py}`
