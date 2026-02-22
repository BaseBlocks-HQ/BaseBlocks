# Security Policy

## Reporting a Vulnerability

We take security issues seriously. If you discover a security vulnerability, please report it responsibly.

**Please do NOT create a public GitHub issue for security vulnerabilities.**

Instead, email us at **security@baseblocks.dev** with:

- A description of the vulnerability
- Steps to reproduce the issue
- The potential impact
- Any suggested fix (optional)

## What We Promise

- We will acknowledge your report within **3 business days**
- We will provide an estimated timeline for a fix
- We will notify you when the vulnerability is resolved
- We will credit you in the release notes (unless you prefer anonymity)
- We will not take legal action against researchers who follow responsible disclosure

## Scope

The following are **in scope**:

- Authentication and authorization bypasses
- Cross-site scripting (XSS)
- Server-side request forgery (SSRF)
- Data exposure or leakage between tenants
- Remote code execution
- SQL/NoSQL injection

The following are **out of scope**:

- Denial of service (DoS/DDoS) attacks
- Social engineering or phishing
- Attacks requiring physical access to a device
- Issues in third-party dependencies (report these upstream)
- Clickjacking on pages with no sensitive actions
- Missing security headers that do not lead to a direct vulnerability
- Automated scanner output without a demonstrated exploit

## Guidelines

- Do not access or modify data belonging to other users
- Do not run automated scanners against production infrastructure
- Do not publicly disclose the vulnerability until we've had a chance to address it
- Make a good-faith effort to avoid disrupting our service

Thank you for helping keep BaseBlocks and our users safe.
