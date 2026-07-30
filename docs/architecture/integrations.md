# Integrations architecture

## Decision

BaseBlocks owns the integration domain, connection ownership, normalized
resources, authorization policy, and product UI. Nango owns external
credentials, OAuth and token refresh, provider API execution, and the
provider-facing sync runtime.

Notion is the first provider. Its `content-metadata` stream discovers pages and
data sources shared during Notion's page-picker authorization flow. BaseBlocks
consumes that stream into its own `integrationResources` table.

This is intentionally a boundary, not a Nango-shaped domain model:

```text
Provider API
    ↓
Nango auth + provider sync
    ↓ signed webhook
BaseBlocks durable sync state
    ↓ cursor consumer
BaseBlocks normalized resources
    ↓
Future bindings: pages, libraries, search, and automation
```

## Why this design

Integration infrastructure has two very different kinds of complexity:

1. Commodity provider complexity: OAuth variants, refresh-token rotation,
   credential encryption, provider rate limits, pagination, polling, webhook
   routing, and reconnect flows.
2. Product complexity: who owns a connection, what a source means in
   BaseBlocks, how external records map to sites and pages, and what users may
   publish.

Building the first category in Convex would create a security-sensitive
integration platform inside the product. Putting the second category into a
vendor would make BaseBlocks' core model dependent on that vendor. The chosen
boundary avoids both outcomes.

Nango is used as a delivery buffer, not as the system of record. Every consumed
record is stored locally with a durable cursor. This matters because Nango
documents retention limits for record payloads, and it gives BaseBlocks a
practical exit path.

## Alternatives considered

### Direct provider implementations

Direct Notion OAuth would be small initially, but the implementation would need
to own encrypted token storage, rotating refresh tokens, provider-specific
reconnect states, and an increasingly complex background execution system.
Convex scheduled actions are at-most-once, so reliable external work would
still need the durable retry state now implemented for record consumption.

Direct providers remain possible behind the adapter boundary, but they are not
the default.

### Pipedream Connect

Pipedream has strong managed auth, a proxy, and a large action/trigger
ecosystem. It is especially attractive for user-configured workflows and AI
tools. For BaseBlocks' first requirement—continuous source replication into
our own content domain—Nango's code-defined syncs, record cache, cursor
consumer, and explicit deletion tracking are a closer fit.

### Airbyte Embedded

Airbyte is excellent for high-volume ELT into central destinations. Its
connection model and operational footprint are heavier than needed for
workspace-level SaaS content connections and interactive OAuth.

### Unified APIs such as Merge

Unified APIs are valuable when many providers expose the same stable business
objects. Notion pages and Confluence pages overlap conceptually but differ
enough that forcing a third-party common model would hide useful capabilities.
BaseBlocks instead normalizes only its own small resource envelope and retains
provider-specific execution behind adapters.

### Better Auth account linking

Sign-in identities and product integrations have different ownership and
lifecycle. Better Auth accounts belong to a user login. BaseBlocks integrations
belong to a workspace, can outlive the member who connected them, require sync
state, and may include several accounts from the same provider. They must not
share a table or lifecycle.

## Domain model

### `integrationConnections`

One workspace-owned authorization. It stores the provider key, adapter,
external connection locator, lifecycle status, operational errors, and a
denormalized active-resource count. It never stores provider credentials.

Lifecycle:

```text
awaitingAuthorization → active → disconnecting → disconnected
          │                │
          └── error ←──────┘
```

An errored connection with external credentials is reauthorized in place.
Recreating it would discard broker-side sync configuration and caches.

### `integrationSyncStates`

One durable consumer state per connection and logical stream. It contains the
cursor, run status, retry attempt, and coalescing flag. Signed sync webhooks
enqueue work; they never perform network-bound ingestion inline.

The consumer is idempotent:

- resources upsert by `(connectionId, externalId)`;
- the cursor advances only after the corresponding resource batch commits;
- duplicate webhooks coalesce through `rerunRequested`;
- transient failures reschedule with exponential backoff;
- a periodic reconciler recovers queued work and actions that never completed;
- a failed action can be safely replayed.

### `integrationResources`

A lightweight provider-neutral envelope for discovered objects:

- stable external identity and resource type;
- display title and URL;
- optional parent identity;
- provider create/edit timestamps;
- soft-deletion state.

Full provider payloads and editor documents do not belong here. Future content
import should have its own versioned snapshot model and an explicit binding
between an external resource and a BaseBlocks target.

## Security model

- Only workspace owners and admins have `integration:manage`.
- Every public action reauthorizes against the owning workspace.
- Nango API keys remain in Convex environment variables.
- Connect sessions are short-lived and restricted to one integration.
- The local connection ID and workspace ID are attached as signed Nango tags.
- Webhooks are accepted only when the raw-body HMAC matches
  `X-Nango-Hmac-Sha256`.
- The webhook signing key is distinct from the Nango API key.
- Unknown webhook types are acknowledged and ignored so adding a Nango event
  does not break delivery.
- Provider credentials never pass through the browser or persist in BaseBlocks.

## Release controls

The Integrations page is always public to signed-in workspace members as a
product roadmap. Functional controls are released separately:

- Next.js evaluates the Vercel boolean flag `notion-integration` on the server.
  When it is off, every provider—including Notion—renders as `Coming soon`, no
  connection query runs, and no connect or management controls are rendered.
- Convex independently requires `INTEGRATIONS_ENABLED=true` before it lists
  connections, begins or reconnects authorization, retries a sync, or consumes
  sync records. The disconnect action remains available as an administrative
  cleanup path for an already-known connection.
- Development is on. Preview and production are off. Convex project defaults
  use the same values so newly created deployments fail closed.

The two controls are intentional. A frontend flag is a release decision, not
an authorization boundary, so Convex must enforce the disabled state even when
a client calls a function directly.

For launch, deploy and verify the complete code while production remains off,
set the production Convex variable to `true`, and then enable the Vercel
production flag. For rollback, disable the Vercel flag first and then set the
Convex variable to `false`.

Local development should run through `vercel env run` so the server receives
the development Vercel Flags configuration without copying SDK credentials
into tracked files.

## Notion setup

1. Create a Nango environment.
2. Add a Notion integration. Its unique key should be `notion`, or set
   `NANGO_NOTION_INTEGRATION_ID` to the chosen key.
3. Configure the Notion public OAuth client in Nango. Notion authorization uses
   a page picker, so the user explicitly shares only selected content.
4. Enable Nango's `content-metadata` sync template for the integration with
   automatic start enabled.
5. Set the Nango webhook URL to:
   `https://<convex-site>/integrations/webhooks/nango`.
6. Enable new-connection and sync webhooks.
7. Copy Nango's webhook signing key to
   `NANGO_WEBHOOK_SIGNING_KEY`.
8. Create a least-privilege Nango environment API key that can create connect
   sessions, reconnect and delete connections, execute syncs, and read sync
   records. Store it as `NANGO_API_KEY`.

For local webhooks, use a tunnel and Nango's per-connection webhook override or
a dedicated development environment.

## Adding a provider

1. Add the provider definition to
   `packages/domain/src/integrations/catalog.ts`.
2. Add its provider key to the Convex validator.
3. Configure the provider integration and auth in Nango.
4. Define a narrow sync record contract for the product use case.
5. Add a provider-specific record normalizer. Do not expose provider payloads
   to UI components.
6. Map the provider's stream to a logical BaseBlocks stream and enqueue it from
   the webhook handler.
7. Add contract tests for auth webhook reconciliation, normalization,
   deletions, cursor advancement, duplicate delivery, and reconnect.
8. Mark the provider `available` only after a real-account dry run.

Provider-specific actions should live behind the same backend boundary.
Two-way sync must keep user-initiated writes separate from read-side
replication.

## Sources

- [Nango auth guide](https://nango.dev/docs/guides/auth/auth-guide)
- [Nango sync architecture](https://nango.dev/docs/getting-started/use-cases/syncs)
- [Nango cursor-based record consumption](https://nango.dev/docs/guides/functions/syncs/sync-functions)
- [Nango webhook signing and lifecycle events](https://nango.dev/docs/guides/platform/webhooks-from-nango)
- [Nango Notion templates](https://nango.dev/docs/api-integrations/notion)
- [Notion public connections](https://developers.notion.com/guides/get-started/public-connections)
- [Convex actions](https://docs.convex.dev/functions/actions)
- [Convex environment variables](https://docs.convex.dev/production/environment-variables)
- [Convex scheduled-function guarantees](https://docs.convex.dev/scheduling/scheduled-functions)
- [Vercel Flags](https://vercel.com/docs/flags/vercel-flags)
- [Vercel Flags SDK](https://vercel.com/docs/flags/vercel-flags/sdks/flags-sdk)
- [Pipedream Connect](https://pipedream.com/docs/connect)
- [Airbyte Embedded](https://reference.airbyte.com/reference/powered-by-airbyte)
- [Merge unified API concepts](https://docs.merge.dev/merge-unified/concepts)
