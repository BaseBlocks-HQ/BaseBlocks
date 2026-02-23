# BaseBlocks

An open-source, multi-tenant site builder. Create documentation sites, knowledge bases, and internal portals — organized by teams, deployed instantly.

## Features

- **Multi-tenant architecture** — teams get their own subdomain (`team.baseblocks.dev`)
- **Visual page builder** — drag-and-drop layouts with blocks (headings, text, images, code, embeds, forms, and more)
- **Draft/deploy workflow** — edit freely, publish when ready, rollback if needed
- **Document libraries** — upload, organize, and search documents with text extraction
- **Customizable themes** — accent colors, navigation styles, header options
- **Access control** — public, private, link-only, or password-protected sites
- **Internationalization** — built-in i18n support

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | [Next.js](https://nextjs.org/) 16, [React](https://react.dev/) 19, [Tailwind CSS](https://tailwindcss.com/) v4 |
| Backend | [Convex](https://convex.dev/) (real-time database + serverless functions) |
| Auth | [Better Auth](https://www.better-auth.com/) |
| Editor | [BlockNote](https://www.blocknotejs.org/) (rich text), custom layout engine |
| UI | [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) |
| Monorepo | [Turborepo](https://turborepo.dev/) + [Bun](https://bun.sh/) workspaces |
| Linting | [Biome](https://biomejs.dev/) |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Bun](https://bun.sh/) >= 1.3
- A [Convex](https://convex.dev/) account

### Setup

```bash
# Clone the repo
git clone https://github.com/naaiyy/BaseBlocks.git
cd BaseBlocks

# Install dependencies
bun install

# Set up environment variables
cp .env.example apps/web/.env.local
cp .env.example packages/backend/.env.local
# Edit both files with your Convex deployment URLs

# Start development
bun run dev
```

This starts the Next.js app on `http://localhost:3001` and the Convex backend.

## Project Structure

```
baseblocks/
├── apps/
│   └── web/                   # Next.js frontend (app router)
│       ├── app/               # Route definitions (thin layer)
│       ├── modules/           # Domain modules (self-contained features)
│       │   ├── dashboard/     # Team dashboard, site cards, libraries
│       │   ├── documents/     # Document library (upload, folders, viewer)
│       │   ├── editor/        # Site editor shell (bridges to @baseblocks/editor)
│       │   ├── elements/      # Block, layout, and section system
│       │   ├── media-viewer/  # File viewer (PDF, image, video, audio)
│       │   ├── navigation/    # Page tree, breadcrumbs, nav menus
│       │   ├── public-site/   # Published site rendering, access control
│       │   └── team/          # Team management, invitations
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
├── turbo.json                 # Turborepo task configuration
├── biome.jsonc                # Linting, formatting, and architectural boundaries
└── package.json               # Workspace root
```

## Scripts

```bash
bun run dev          # Start all apps in development mode
bun run build        # Build all apps and packages
bun run lint         # Lint and format with Biome
bun run check-types  # TypeScript type checking
```

## Roadmap

The high-level plan for the project, in order of priority:

|  #  | Step                                                         | Status |
| :-: | ------------------------------------------------------------ | :----: |
|  1  | Core platform — multi-tenant site builder with visual editor |   ✅   |
|  2  | Draft/deploy workflow with rollback                          |   ✅   |
|  3  | Document libraries with text extraction                      |   ✅   |
|  4  | Access control — public, private, link-only, password        |   ✅   |
|  5  | Custom domains                                               |   ❌   |
|  6  | Payments & billing                                           |   ❌   |
|  7  | Custom Block SDK — build your own blocks with our APIs       |   ❌   |
|  8  | Block Marketplace — discover and share community blocks      |   ❌   |
|  9  | AI-powered experience — AI blocks and agentic site builder   |   ❌   |
| 10  | Embeddable SDK — embed BaseBlocks in any software            |   ❌   |
| 11  | Templates & starter sites                                    |   ❌   |
| 12  | Analytics & insights                                         |   ❌   |
| 13  | Public API                                                   |   ❌   |

#### Core Platform

Multi-tenant architecture where teams get their own subdomain (`team.baseblocks.dev`). Visual drag-and-drop page builder with blocks for headings, text, images, code, embeds, forms, and more. Customizable themes with accent colors, navigation styles, and header options. Built-in i18n support.

#### Draft/Deploy Workflow

Edit freely in draft mode, publish when ready, and rollback to any previous deployment if needed. Full deployment history with one-click restore.

#### Document Libraries

Upload, organize, and search documents with automatic text extraction. Supports PDF, images, video, and audio with an integrated media viewer.

#### Access Control

Sites can be public, private (team-only), link-only, or password-protected. Granular permissions per site.

#### Custom Domains

Map your own domain to any published site. Automatic SSL provisioning and DNS verification.

#### Payments & Billing

Subscription plans for teams with usage-based pricing. Marketplace payment processing for block creators. Stripe integration for billing, invoicing, and payouts.

#### Custom Block SDK

A developer-facing API and SDK for building custom blocks. Define your own block types with custom rendering, configuration panels, and data sources. Blocks can be private to your team or published to the marketplace. Full documentation, CLI tooling, and local development environment.

#### Block Marketplace

A community-driven marketplace where developers can publish, discover, and install blocks. Ratings, reviews, and verified publishers. Revenue sharing for paid blocks. Categories spanning content, data visualization, integrations, forms, navigation, and more.

#### AI-Powered Experience

AI blocks that generate and transform content inline — text, images, layouts, and code. An agentic site builder that can scaffold entire sites from a prompt, suggest layouts, and auto-populate content. AI-assisted editing for rewriting, translating, and summarizing. Bring-your-own-key or built-in credits.

#### Embeddable SDK

A lightweight SDK (`@baseblocks/embed`) for embedding BaseBlocks sites, pages, or individual blocks into any application. Framework-agnostic with first-class adapters for React, Vue, Angular, and web components. Enterprise integrations for Salesforce, Oracle, ServiceNow, and more. Embed as an iframe, a web component, or a native SDK. White-label support for OEM use cases.

#### Templates & Starter Sites

Pre-built site templates for common use cases — documentation, knowledge bases, internal portals, changelogs, and landing pages. One-click clone and customize.

#### Analytics & Insights

Built-in analytics for published sites — page views, visitor counts, popular pages, and referral sources. Privacy-friendly with no third-party trackers.

#### Public API

A RESTful API for programmatic site management — create sites, manage pages, publish deployments, and manage team members. API keys with scoped permissions.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions, coding standards, and PR guidelines.

## License

[MIT](./LICENSE)
