# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in G0DM0DƎ, please report it responsibly.

**Please do NOT open a public GitHub issue for security vulnerabilities.**

### What to include

- Description of the vulnerability
- Steps to reproduce
- Impact assessment
- Suggested fix (if you have one)

### Scope

In scope:
- The React/Next.js frontend application (`src/`)
- State persistence logic (Zustand/localStorage)
- API integration logic (OpenRouter & AgentRouter)
- Deployment configuration (Next.js Build/Output)

Out of scope:
- Third-party dependencies (report upstream, but let us know)
- Social engineering attacks
- Denial of service attacks against hosted instances

## Supported Versions

| Version | Supported |
|---------|-----------|
| 3.5.x   | Yes       |
| < 3.0   | No        |

## Security Design

- **Zero Server Storage:** G0DM0DƎ is a client-side architecture. Your API keys are stored only in your browser's `localStorage` and are never transmitted to any server except the official AI providers (OpenRouter/AgentRouter).
- **Environment Safety:** Built-in support for `.env` files with strict `NEXT_PUBLIC_` prefixing to prevent accidental exposure of server-side secrets.
- **Privacy by Default:** Opt-in dataset collection ensures that no data leaves your machine without explicit consent.
- **Headers:** HSTS, CSP, and XSRF protection provided via Next.js standard security defaults.
