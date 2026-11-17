# Review rules: kaltura-embeds-docs

Read by the `docs-review` plugin skills (`/docs-review:security-review`, `content-safety`, `release-gate`). Generic checks live in the plugin; this file holds what only this repo knows. Conventions for examples are in `README.md` ("Adding an example").

## What this repo publishes

- **The whole repo is public on GitHub.** Readers clone it and run the examples on their own machines with their own Kaltura IDs, and the docs site (docs.kaltura.com) links to each example. Treat every tracked file as published.
- **Examples** (`examples/<name>/`): a small local Node server (`server.mjs`), browser pages and scripts, and agent setup files (`agent/*.md` prompts and knowledge, `agent/client-tools.json`) that readers paste into their own agent. Agent files are instructions an AI follows, and an example's page code runs in the reader's browser next to a live avatar session.
- There's no build, deploy or CI publishing step. The only workflow is the review itself.

## Known-safe values

- Public Kaltura API hosts used as defaults: `https://www.kaltura.com/api_v3`, `https://api.avatar.us.kaltura.ai` (and other `api.avatar.<region>.kaltura.ai`).
- `.env.example` files with empty values or placeholders.
- A widget ID and partner ID returned by an example's local `/config.json`: they're public identifiers of the reader's own agent, already visible in any page that embeds it.
- Fictional brands, people and data in scenarios (required by `README.md`).

## Files that hold secrets locally (never open)

- `examples/*/.env` (git-ignored). A tracked `.env`, a KS, an admin secret or an API key anywhere in the repo is `high`.

## Repo-specific checks

- **security-review**
  - Example servers serve only files inside the example folder, never dotfiles or the server source: check every new or changed static-file handler for path traversal (`..`, encoded `%2e%2e`, absolute paths) and for `.env` exposure.
  - Example servers read secrets only from `.env`, never send a secret, admin KS or `.env` value to the browser, and never log them. A server-side KS, if an example needs one, is a privileged-less session with a short expiry.
  - Report as `low` (hardening, not blockers): a server listening on all interfaces where `127.0.0.1` would do; a request handler that can crash the process on bad input (for example `decodeURIComponent` on a malformed `%`); missing `Cache-Control: no-store` on config responses.
  - Page code: no `innerHTML` with agent or user text; `postMessage` listeners check `event.origin` and `event.source`; bridges between a WebView and native code validate message shape and allow only listed actions.
  - Client tools (`agent/client-tools.json` and their handlers): every tool's handler validates its arguments, and no tool can run arbitrary code, navigate to arbitrary URLs, or read data outside what the example shows.
  - Agent prompts (`agent/*.md`): no instructions to reveal system prompts, secrets or session data, and nothing that tells the agent to call tools the example doesn't define.
  - Dependencies: examples should have none (`README.md`); a new dependency must be the point of the example, pinned, and from a well-known package.
- **content-safety** (target `production`: the repo is public)
  - No real customer or partner names, real partner IDs, widget IDs, KS tokens or internal hosts in code, `.env.example`, prompts or READMEs. Staging hosts (`*.nvq2.*`, `*.qa.kaltura.ai`) only if the README says the example is for staging.
  - Docs links point to docs.kaltura.com pages that exist in production, not to the staging docs host.
  - Product naming follows docs-kaltura-com: "Dynamic UI" / "Dynamic UI Elements" in prose, never "Gen UI" or "Kaltura Embeds" (code identifiers, package names and the repo name excepted). Report as `low`.
- **release-gate**
  - Only @esakal merges into `main` (the "manage main" ruleset; others open PRs).
  - Pre-release checks, per example touched: it has `package.json` with a `start` script, a `.env.example` listing every variable the code reads, a `README.md` with the required sections, and a row in the root README table. Run `node --check` on each changed `.js`/`.mjs` file. Don't run `npm start` (it needs the reader's own agent).
