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

4. **Start the dev server**

   ```bash
   bun run dev
   ```

   This starts both the Next.js app (port 3001) and Convex backend.

## Project Structure

```
baseblocks/
├── apps/
│   └── web/                 # Next.js frontend
│       ├── app/             # Route definitions (thin layer)
│       ├── features/        # Feature modules (domain-organized)
│       ├── components/      # Shared UI (dialogs, icons, skeletons)
│       ├── hooks/           # App-level hooks
│       └── lib/             # Utilities
├── packages/
│   ├── backend/             # Convex backend (schema, queries, mutations)
│   ├── editor/              # Page editor engine (drag-and-drop, layouts, blocks)
│   ├── types/               # Shared TypeScript type definitions
│   ├── ui/                  # Shared UI components (shadcn/ui + Radix)
│   ├── tsconfig/            # Shared TypeScript configurations
│   └── tailwind-config/     # Shared Tailwind CSS and PostCSS config
├── turbo.json               # Turborepo task config
├── biome.jsonc              # Linting and formatting
└── package.json             # Workspace root
```

### Frontend Organization

The `apps/web/` app follows a **feature-based** architecture:

- **`features/`** — Domain modules, each self-contained with its own components and hooks:
  - `dashboard/` — Team dashboard, site cards, library management
  - `documents/` — Document library (upload, folders, file viewer)
  - `editor/` — Site editor integration (bridges to `@baseblocks/editor`)
  - `elements/` — Block & layout system (blocks, sections, forms, customization)
  - `media-viewer/` — File viewer (PDF, image, video, audio, text)
  - `public-site/` — Published site rendering, access control
  - `team/` — Team management, invitations
- **`components/`** — Truly shared, non-feature UI (dialogs, icons, skeletons, nav)
- **`hooks/`** — App-level hooks only. For cross-package hooks, import directly from the source package.
- **`lib/`** — Utilities split by concern (`url.ts`, `tree-utils.ts`, `storage/`, `validation/`)

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
