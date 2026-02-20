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

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions, coding standards, and PR guidelines.

## License

[MIT](./LICENSE)
