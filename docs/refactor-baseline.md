# Refactor baseline

Recorded on 2026-07-10 before architectural changes.

## Repository

- Branch: `main`, tracking `origin/main`
- Worktree: clean
- Package manager: Bun 1.3.1
- Monorepo orchestration: Turborepo 2.9.14
- TypeScript: 5.9.2
- Next.js: 16.2.6
- React: 19.2.6
- Convex: 1.39.1
- Better Auth: 1.6.11
- Better Auth Convex component: 0.12.2
- Files SDK: 2.0.0
- next-intl: 4.12.0

The dependency manifests and `bun.lock` remain the complete version record.

## Automated baseline

| Check | Command | Result |
| --- | --- | --- |
| Typecheck | `bun run check-types` | Pass |
| Production build | `bun run build` | Pass |
| Convex generation | `bunx convex codegen` from `packages/backend` | Pass |

The production build emitted one non-fatal existing warning: `` `z-index` is currently not supported. ``

## Current route behavior

The production build exposes these route families before the refactor:

- localized root, documentation, legal, login, and onboarding routes
- `/[locale]/dashboard/[teamSlug]` with team, site, and library children
- internal published-site routes at `/[locale]/site/[subdomain]/...`
- Better Auth, file, export, search, storage, favicon, Open Graph, robots, and sitemap HTTP routes

Current Proxy behavior rewrites `{teamSlug}.baseblocks.dev` to the internal site route, treats other non-root hosts as custom domains, redirects `www` to the apex domain, and uses `/s/{teamSlug}` plus a `__preview_team` cookie for preview navigation. These are baseline observations, not target contracts.

## Current Convex shape

The pre-refactor schema contains duplicated `teams` and `members` records alongside Better Auth organization data. Sites reference `teamId`. Page composition is normalized across `pages`, `sections`, `columns`, and `blocks`. These structures are explicitly scheduled for replacement by later phases.

## Linked Vercel project

- Project: `base-blocks`
- Project ID: configured through `VERCEL_PROJECT_ID`
- Owner/team: `naaiyy's projects`
- Root directory: `apps/web`
- Framework preset: Next.js
- Node.js runtime setting: 24.x
- `baseblocks.dev`: attached and verified
- `*.baseblocks.dev`: attached and verified
- Vercel deployment hostname: `base-blocks-liard.vercel.app`

The configured Vercel environment-variable names were inspected without reading their values. They currently cover Convex public URLs, the public root domain, Files SDK/storage settings, and extraction service settings. `NEXT_PUBLIC_ROOT_DOMAIN` exists only in Production at this baseline.

Local environment files additionally declare authentication provider credentials, Better Auth application URLs, and Convex deployment settings. Secret values were not printed or copied into this document.

## Manual verification checkpoint

The repository owner performs runtime verification by launching the site. Before Phase 1, verify:

- authentication and onboarding
- dashboard and organization/team navigation
- organization switching, invitations, and membership management
- site creation/editing and publishing
- library navigation
- file upload and preview
- default published-site routing
- custom-domain published-site routing, if configured

Record any failure before beginning Phase 1 so it is distinguishable from refactor regressions.
