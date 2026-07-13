# Contributing to BaseBlocks

Thanks for your interest in contributing to BaseBlocks! This document covers the setup, workflow, and standards for contributing.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Bun](https://bun.sh/) >= 1.3
- A [Convex](https://convex.dev/) account (free tier works)

## Getting Started

1. **Fork and clone the repo**

   ```bash
   git clone https://github.com/<your-username>/BaseBlocks.git
   cd BaseBlocks
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Set up environment variables**

   Copy `.env.example` and fill in your values:

   ```bash
   cp .env.example apps/web/.env.local
   cp .env.example packages/backend/.env.local
   ```

   Then edit each file — you'll need a Convex deployment URL from `npx convex dev`.

   `SITE_URL` is the Convex site origin used for backend HTTP endpoints.
   `APP_URL` is the comma-separated allowlist of exact app origins that are
   allowed to start sign-in and receive the final redirect.

   ```env
   SITE_URL=https://your-deployment.convex.site
   APP_URL=http://localhost:3001
   ```

   Register your OAuth providers against the app origin. For Google:

   - App origins, where the provider uses them:
     - `http://localhost:3001`
   - Redirect URIs:
     - `http://localhost:3001/api/auth/callback/google`

   Production note: published subdomains on `*.baseblocks.dev` rely on Better
   Auth shared cookies on `.baseblocks.dev` so authenticated audience-restricted
   pages work on the real published site. That configuration lives in
   `packages/backend/convex/authSetup.ts` via
   `advanced.crossSubDomainCookies`. This applies to BaseBlocks subdomains only,
   not arbitrary custom domains.

4. **Start the dev server**

   ```bash
   bun run dev
   ```

   This starts both the Next.js app (port 3001) and Convex backend.

   Microsoft caveat: if Microsoft auth succeeds for one account but another
   account returns to `?error=email_not_found`, the redirect URI is usually
   correct. Better Auth's Microsoft provider expects an `email` claim in the ID
   token. Add the `email` optional claim for ID tokens in the Entra app
   registration and verify whether your tenant/account-type choice (`common`,
   single-tenant, work/school, personal) matches the accounts you want to
   support.

## Project Structure

```
baseblocks/
├── apps/
│   └── web/                   # Next.js frontend
│       ├── app/               # Route definitions (thin layer)
│       ├── modules/           # Domain modules (self-contained features)
│       ├── components/        # Shared UI only (dialogs, skeletons)
│       ├── hooks/             # App-level hooks (direct imports, no barrels)
│       └── lib/               # Utilities by concern (auth/, convex/, storage/)
├── packages/
│   ├── backend/               # Convex backend (schema, queries, mutations)
│   ├── editor/                # Page editor engine (drag-and-drop, layouts, undo)
│   ├── types/                 # Shared type definitions (zero dependencies)
│   └── ui/                    # UI component library (shadcn/ui + Radix)
├── tooling/
│   ├── tsconfig/              # Shared TypeScript configurations
│   └── tailwind/              # Shared Tailwind CSS and PostCSS config
├── turbo.json                 # Turborepo task config
├── biome.jsonc                # Linting, formatting, and architectural boundaries
└── package.json               # Workspace root
```

### Frontend Organization

The `apps/web/` app follows a **module-based** architecture:

- **`modules/`** — Domain modules, each self-contained with its own components, hooks, and dialogs:
  - `dashboard/` — Team dashboard, site cards, library management
  - `documents/` — Document library (upload, folders, file viewer)
  - `editor/` — Site editor shell (bridges to `@baseblocks/editor`)
  - `elements/` — Block, layout, and section system (registry, editors, renderers, previews)
  - `media-viewer/` — File viewer (PDF, image, video, audio, text)
  - `navigation/` — Page tree and sortable navigation menus
  - `public-site/` — Published site rendering, access control
  - `team/` — Team management, invitations
- **`components/`** — Truly shared, non-feature UI only (dialogs, skeletons, site-logo)
- **`hooks/`** — App-level hooks only. Import directly from source files, not through barrels.
- **`lib/`** — Utilities organized by concern (`auth/`, `convex/`, `storage/`, `url.ts`, `tree.ts`)

### Architectural Boundaries

Biome enforces import boundaries at lint time:

- `packages/domain` must remain standalone (no backend, UI, or React imports)
- `packages/ui` must not import from backend or editor
- `lib/` must not import from `modules/` (lib is a lower layer)
- `components/` must not import from `modules/` (shared components are a lower layer)

## Development Workflow

1. **Create a branch** from `main`:

   ```bash
   git checkout -b feat/your-feature
   ```

2. **Make your changes** — keep commits focused and descriptive.

3. **Lint and format** before committing:

   ```bash
   bun run lint
   bun run check-types
   ```

4. **Push and open a PR** against `main`.

## Code Standards

- **TypeScript** everywhere — no `any` unless absolutely unavoidable.
- **Biome** for linting and formatting — run `bun run lint` to auto-fix.
- **Component files** should stay under 300 lines. If a component grows larger, split it.
- **Naming**: kebab-case for files, PascalCase for components, camelCase for functions/variables.
- **Imports**: Use `@/` alias for `apps/web` internal imports. Use `@baseblocks/*` for cross-package imports. Import hooks directly from their source package (e.g., `@baseblocks/ui/hooks/use-debounce`), not through barrel re-exports.

## PR Guidelines

- Keep PRs focused — one feature or fix per PR.
- Write a clear description of what changed and why.
- Make sure CI passes (lint + typecheck + build).
- Screenshots or recordings for UI changes are appreciated.

## Architecture Decisions

BaseBlocks is a multi-tenant site builder. Key architectural concepts:

- **Teams** own **Sites**, which contain **Pages** with **Layouts** and **Blocks**.
- Subdomain-based routing: `team-slug.baseblocks.dev/site-slug/page`.
- Draft/published content model — edits are drafts until explicitly deployed.
- Convex provides real-time data sync — no REST API layer needed.

## Questions?

Open an issue or start a discussion on GitHub. We're happy to help.
