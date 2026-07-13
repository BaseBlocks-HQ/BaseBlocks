# BaseBlocks

BaseBlocks is an open-source, multi-workspace site builder for documentation, knowledge bases, internal portals, onboarding hubs, and public resources.

Teams create structured sites with a block editor, organize pages and document libraries, publish a consistent site experience, and control who can access it.

**Documentation:** [baseblocks.dev/docs](https://baseblocks.dev/docs)

## Features

- **Block editor** — rich text, lists, callouts, code, tables, columns, images, attachments, pages, Mermaid diagrams, and interactive BaseBlocks blocks
- **Page trees** — nested pages, navigation visibility, page access policies, and embedded page references
- **Interactive blocks** — quick links, directories, site search, document libraries, and decision trees
- **Published sites** — responsive sidebar navigation with a transparent content header
- **Site identity** — optional sidebar logo, site name, and favicon
- **Access control** — public, private, unlisted, and access-code-protected sites
- **Custom domains** — DNS verification and managed TLS through Vercel
- **Document libraries** — uploads, folders, search, text extraction, previews, and downloads
- **Workspace management** — multiple teams, invitations, roles, and workspace switching
- **Internationalization** — English and French product UI and documentation
- **Self-hosting** — Convex backend and S3-compatible file storage

## Publishing model

A site can be published or unpublished. Publishing makes the current saved content available at its generated URL and any verified custom domain. Unpublishing removes public access without deleting the site.

Published sites currently read the latest saved page content. Historical deployment snapshots and rollback are not implemented yet.

## Tech stack

| Layer | Technology |
|---|---|
| Web | [Next.js 16](https://nextjs.org/), [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/) |
| Editor | [OpenEditor](https://github.com/EasyLink-HQ/openeditor), Tiptap, and BaseBlocks extensions |
| Backend | [Convex](https://convex.dev/) |
| Authentication | [Better Auth](https://www.better-auth.com/) with email/password and social providers |
| Files | Files SDK with S3-compatible storage |
| UI | shadcn/ui, Radix UI, Base UI, and Nucleo Glass icons |
| Monorepo | [Turborepo](https://turborepo.dev/) and [Bun](https://bun.sh/) workspaces |
| Quality | TypeScript, [Biome](https://biomejs.dev/), Bun Test |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 20.9 or newer
- [Bun](https://bun.sh/) 1.3 or newer
- A [Convex](https://convex.dev/) account
- An S3-compatible bucket for file uploads

Vercel credentials are only required when developing custom-domain lifecycle features. OAuth credentials are only required for the social providers you enable.

### Setup

```bash
git clone https://github.com/BaseBlocks-HQ/BaseBlocks.git
cd BaseBlocks

bun install

cp .env.example apps/web/.env.local
cp .env.example packages/backend/.env.local
```

Edit the two environment files and fill in the values for their corresponding sections in `.env.example`. At minimum, configure Convex, `BETTER_AUTH_SECRET`, the application URLs, and file storage.

Start the web application and Convex backend:

```bash
bun run dev
```

The web application runs at [http://localhost:3001](http://localhost:3001).

### Authentication callbacks

For local social authentication, configure these provider callbacks:

| Provider | Local callback |
|---|---|
| Google | `http://localhost:3001/api/auth/callback/google` |
| GitHub | `http://localhost:3001/api/auth/callback/github` |
| Microsoft | `http://localhost:3001/api/auth/callback/microsoft` |

Google also requires `http://localhost:3001` as an authorized JavaScript origin.

Production subdomains use Better Auth shared cookies on `.baseblocks.dev`, configured in `packages/backend/convex/auth.ts`. Authentication on arbitrary custom domains requires a separate cookie and session design.

Some Microsoft Entra accounts do not include an `email` claim by default. If a callback returns `?error=email_not_found`, add the `email` optional claim for ID tokens in the Microsoft application registration.

## Repository structure

```text
baseblocks/
├── apps/
│   └── web/
│       ├── app/                  # Next.js routes and API handlers
│       ├── components/
│       │   ├── file-viewer/      # File previews and upload surfaces
│       │   ├── site-elements/    # Site-specific content primitives
│       │   └── site-runtime/     # Shared editor/viewer runtime contexts
│       ├── features/
│       │   ├── authentication/   # Session and workspace access
│       │   ├── dashboard/        # Sites, members, and workspace shell
│       │   ├── editor/           # Editor chrome, sidebar, pages, and settings
│       │   ├── openeditor/       # OpenEditor integration and extensions
│       │   ├── libraries/        # Document-library management
│       │   ├── marketing/        # Website, docs, and legal content
│       │   └── published-sites/  # Public rendering, metadata, and access
│       ├── i18n/                 # Next.js locale routing
│       └── lib/                  # Auth, Convex, files, routing, and Vercel
├── packages/
│   ├── backend/                  # Convex schema, queries, and mutations
│   ├── domain/                   # Shared domain models and validators
│   ├── i18n/                     # English and French messages
│   └── ui/                       # Shared UI components
├── tooling/
│   └── tsconfig/                 # Shared TypeScript configuration
├── biome.jsonc                   # Formatting and architectural boundaries
├── turbo.json                    # Monorepo task graph
└── package.json                  # Workspace scripts and dependency policy
```

## Scripts

```bash
bun run dev          # Start workspace development processes
bun run build        # Build the complete workspace
bun run lint         # Lint the repository with Biome
bun run format       # Format the repository with Biome
bun run check-types  # Run workspace TypeScript checks
bun run test         # Run the repository test suite
bun run clean        # Remove generated build and task caches
```

Run a focused test directory with:

```bash
bun test apps/web/features/openeditor
```

## Storage

File storage is selected through environment variables. The current adapter supports S3-compatible services including AWS S3, Cloudflare R2, MinIO, Backblaze B2, and compatible hosted buckets.

Relevant settings include:

- `FILES_BUCKET`
- `FILES_ENDPOINT`
- `FILES_REGION`
- `FILES_FORCE_PATH_STYLE`
- `FILES_ACCESS_KEY_ID`
- `FILES_SECRET_ACCESS_KEY`
- `FILES_MAX_UPLOAD_SIZE_BYTES`

Document text extraction can be connected through `EXTRACTION_API_URL` and `EXTRACTION_API_SECRET`.

## Roadmap

Active areas of work include:

- Continued editor polish and accessibility
- Historical publishing snapshots and rollback
- Broader custom-block APIs
- Templates and starter sites
- Analytics and insights
- Public APIs and embeddable surfaces
- AI-assisted site creation and editing

The roadmap is directional. Repository issues and documentation are the source of truth for shipped behavior.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for local development, code standards, and pull-request guidance.

## License

[MIT](./LICENSE)
