# VoodooScience.github.io

Public portfolio site (GitHub Pages) and evidence of my Solution Architecture development. This repo is the single source of truth for all public pages and shared assets under `/assets/*`.

## What this repo contains

- Static HTML pages (root and subfolders like `/about`, `/case-studies`, `/lab`).
- Shared assets: CSS, JS, images, fonts, partials in `/assets/*`.
- Section stub expansion via `assets/script/sections.js` for consistent layouts.
- CMS markers to define safe, editable regions.

## Architecture at a glance

- Static site hosted on GitHub Pages.
- Admin UI (`sa-portfolio-admin-ui`) proxies `/assets/*` from this repo.
- A CMS Worker reads/writes via GitHub PRs; no direct writes to `main`.

## CMS integration (non-destructive)

Pages opt in to CMS editing with explicit markers:

```
<!-- CMS:START hero -->
...
<!-- CMS:END hero -->

<!-- CMS:START main -->
...
<!-- CMS:END main -->
```

Only content inside those markers is editable by the CMS. Everything else is read-only, which keeps layout and structure stable.

## Content model

- Section stubs: `data-type="imgText"`, `data-type="split50"`, `data-type="twoCol"`.
- Inline stubs: `div.img-stub` (images), `div.video-stub` (video), and `div.doc-embed` (document embeds).
- Rich blocks (accordions, doc cards, portfolio grids) are HTML fragments that the CMS can insert and re-serialize safely.
- The portfolio grid includes an embedded JSON payload for round-trip editing.

## CMS constraints and parity

- RTE output is sanitized (no inline styles/scripts, no arbitrary iframes); rich content is inserted via tools to keep diffs deterministic.
- Admin preview loads the same partials and scripts as production to keep layout parity.

## Runtime composition

- `assets/script/dom-loader.js` injects shared partials (nav, footer, etc).
- `assets/script/sections.js` expands `.section`, `.img-stub`, `.video-stub`, and `.doc-embed` stubs.
- `assets/script/lightbox.js` initializes `js-lightbox` behavior.

## Editing workflow

- Edit HTML directly for content and structure changes.
- Reuse section stubs and let `sections.js` expand them at runtime.
- Keep shared styles in `/assets/css/*` so the public site and CMS preview stay in sync.

## Environments

- Production uses the default branch on GitHub Pages.
- Separate Cloudflare Pages projects provide dev/staging with the same Access controls before changes are promoted to production.

## Branching and environments

- `dev` branch → dev site (`https://dev.portfolio.tacsa.co.uk`).
- `master` branch → production site (`https://portfolio.tacsa.co.uk`).
- The CMS worker targets the branch set via `GITHUB_DEFAULT_BRANCH`.

## Security posture

- No secrets in the repo; all credentials live in Cloudflare environment settings.
- CMS updates are PR-only, enabling review, audit trails, and rollback.
- Separation of concerns: public site assets live here; admin-only logic lives in the admin repo.

## Operational constraints (non-negotiable)

- No arbitrary HTML insertion (CMS writes only validated block/inline stubs).
- No formatters/prettifiers touching CMS content.
- Never normalize whitespace inside `<pre>` or `<code>`.
- Serialization must be deterministic and idempotent (load → edit → save → reload).
- Baseline block order is immutable; “current” order is derived.

## Governance

- Changes ship via version control and CI/CD, not direct edits.
- Asset ownership is centralized to avoid drift between repos.

## ADRs / architecture notes

- Canonical CMS block schema + serialization rules live in `docs/adr`.
- Key baseline decisions: ADR-013 (blocks), ADR-014 (RTE), ADR-015 (serializer).

## Key decisions and tradeoffs

- Single source of truth for `/assets/*` avoids drift, but couples the admin UI to the public site’s availability.
- CMS markers protect layout integrity, but limit edits to defined regions.
- PR-only writes improve auditability, but add a review step before publishing.
- Cloudflare Access gates CMS writes to reduce exposure of the GitHub API.

## Related repos

- Admin UI: `sa-portfolio-admin-ui` (CMS front-end).

## Links

- Public site (prod): https://portfolio.tacsa.co.uk/
- Public site (dev): https://dev.portfolio.tacsa.co.uk/
- Admin (prod): https://admin.portfolio.tacsa.co.uk/
- Admin (dev): https://dev.admin.portfolio.tacsa.co.uk/

## FAQ

- Why markers? They create a clear editable boundary so the CMS can update content without risking layout/structure regressions.
- Why section stubs? They keep authoring simple while `sections.js` expands consistent, production-ready markup.
