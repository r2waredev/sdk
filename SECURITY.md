# Security Policy

## Reporting a vulnerability

Thank you for helping keep `@r2ware/sdk` and its users safe.

**Please do not open a public GitHub issue for a security vulnerability.**
Instead, report it privately using GitHub's built-in private vulnerability
reporting:

1. Go to <https://github.com/r2waredev/sdk/security/advisories/new>
2. Click **Report a vulnerability** (or use the **Security** tab →
   **Report a vulnerability** button).
3. Fill in the details and submit. Only repository maintainers will see it.

This keeps your report private, lets us coordinate a fix before any public
disclosure, and allows us to publish a coordinated GitHub Security Advisory —
with credit to you, if you'd like.

### What to include

- A clear description of the issue and its impact.
- Steps to reproduce, or a proof-of-concept. For the SDK, a minimal HTML page
  that loads the published bundle is ideal.
- The affected version (e.g. `@r2ware/sdk@1.2.3`) or a commit SHA.
- Any mitigations you've already identified.

## Response expectations

- We will acknowledge receipt within **2 business days**.
- We'll assess severity and keep you updated while we work on a fix.
- We aim to release a fix for the latest supported version within
  **30 days** for high-severity issues and **90 days** for others, coordinating
  a disclosure date with you. Complex issues may take longer; we'll tell you so.

## Scope

**In scope**

- The SDK source in this repository: `src/`, `build.mjs`, and the shipped
  `dist/` artifacts published to npm as `@r2ware/sdk`.
- The bundled JavaScript/CSS as consumed from jsDelivr or npm.

**Out of scope**

- The r2ware platform/backend and any `/api/*` or `/app/*` endpoints the SDK
  calls — those are owned by a separate team; report them through the
  platform's own channels.
- Vulnerabilities in third-party dependencies — report those upstream to the
  dependency's maintainers. We'll still update our dependency tree promptly
  once an upstream fix lands.
- Issues caused by site owners misconfiguring the SDK or exposing their own
  credentials.
- Self-XSS or any attack that requires the victim to run the attacker's own
  code on their own machine.

If you're unsure whether something is in scope, send the report anyway — we'll
route it correctly.

## Supported versions

Only the **latest released** version of `@r2ware/sdk` receives security fixes.
Upgrade to the newest release before reporting.

| Version          | Supported          |
| ---------------- | ------------------ |
| latest release   | :white_check_mark: |
| older releases   | :x: (upgrade)     |
| unreleased `main`| :microscope: best-effort, not a release |

## Safe harbor

We appreciate responsible disclosure. We will not take action against
researchers who, in good faith:

- Avoid accessing, modifying, or destroying others' data,
- Do not degrade service availability, and
- Give us reasonable time to remediate before any public disclosure.

## Disclosure

We prefer coordinated disclosure. Once a fix is released, we'll publish a
GitHub Security Advisory crediting the reporter — unless you'd prefer to
remain anonymous.
