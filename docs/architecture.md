# BaseBlocks architecture

BaseBlocks is a multi-tenant publishing application. Each concern has one authority, and application boundaries must preserve that ownership rather than duplicate it.

## Ownership

- Better Auth owns users, sessions, social accounts, organizations, organization identity, memberships, roles, permissions, and invitations.
- Convex owns BaseBlocks product data and authorizes every protected query and mutation at the function boundary.
- Next.js owns application routing, HTTP boundaries, metadata, published-site presentation, and file transport.
- Vercel for Platforms owns wildcard routing, custom-domain attachment, DNS verification, certificates, and multitenant preview infrastructure.
- Files SDK is the sole object-storage interface. Railway S3 stores bytes; Convex stores file metadata and product relationships.
- The domain package contains only portable schemas and pure domain rules. shadcn supplies UI primitives, and DnD Kit supplies drag-and-drop behavior.

## Canonical models

- Better Auth organizations are referenced by their Better Auth organization ID; BaseBlocks does not copy membership or organization identity.
- A site owns its branding and belongs to one organization.
- Page metadata is separate from one canonical page-content model. Stable IDs identify embedded tabs, sections, columns, and blocks.
- A single published-site resolver supplies rendering, navigation, access, metadata, structured data, and search context.
- Editor and published views use the same presentation components, with editing capabilities added only in the editor.
- One upload workflow serves documents, images, and site assets; domain records attach the resulting file metadata.
- One stable-ID tree model and one inline-rename primitive serve all editable trees and their read-only published forms.
- Search records are derived indexes, never an alternative source of product content or signed URLs.

## URL contract

The default locale uses an as-needed prefix. Non-default locales are prefixed consistently.

### Main application

```text
https://baseblocks.dev/
https://baseblocks.dev/{locale}/...
https://baseblocks.dev/{locale}/dashboard/{organizationSlug}/...
```

`www.baseblocks.dev` permanently redirects to `baseblocks.dev`.

### Default published sites

```text
https://{organizationSlug}.baseblocks.dev/{siteSlug}
https://{organizationSlug}.baseblocks.dev/{siteSlug}/{pagePath...}
```

Page paths may nest without a fixed maximum depth.

### Custom domains

A custom hostname belongs to exactly one site. Its root represents that site, so the BaseBlocks site slug is not repeated.

```text
https://docs.example.com/
https://docs.example.com/{pagePath...}
```

### Preview sites

When the Vercel plan supports multitenant preview hostnames, previews use Vercel's dynamic hostname prefix and the same tenant parsing contract. Preview routing must not depend on cookies or a separate `/s/...` public URL.

## Boundary rules

- Proxy normalizes the hostname and rewrites to an internal published route; it does not perform product authorization or load the full site.
- Server Components resolve published content through the canonical Convex read model.
- Protected Convex functions authenticate and authorize internally. Layout redirects are navigation behavior, not a security boundary.
- Next.js alone configures Files SDK and coordinates signed upload, download, range, HEAD, and deletion operations.
- Vercel is authoritative for domain verification and infrastructure state; Convex stores only the domain-to-site mapping and application status needed for resolution.
- Public metadata, canonical URLs, sitemap entries, JSON-LD, favicons, and OG images derive from the same host parser, URL builders, and published read model.

## Deliberate exclusions

Until product requirements prove otherwise, BaseBlocks has no compatibility layer, duplicated authority, deployment history, content snapshots, rollback system, migration adapters, or parallel old/new implementations.
