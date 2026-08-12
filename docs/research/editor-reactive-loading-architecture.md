# Production architecture for reactive editor loading

Research date: 2026-08-12. Sources are current official React, Next.js,
Convex, and Convex Better Auth documentation.

## Conclusion

The server-to-client authentication fix is the documented architecture, and
the coordinated client readiness check is correct. The remaining structural
simplification is to make the backend API match the UI's actual consistency
boundary: the site, pages, selected page document, restore state, and release
summary form one **editor snapshot** and should be returned by one authenticated
reactive Convex query.

The production shape should be:

1. The authenticated Next.js layout obtains the token on the server and gives
   it to `ConvexBetterAuthProvider` as `initialToken`.
2. One reactive `getEditorSnapshot({ organizationId, siteId, pageId })` query
   returns a discriminated result such as `missing | restoring | ready` and,
   when ready, all data required for the first editor paint.
3. The client derives loading directly from the query's `undefined` result and
   does not mount the themed editor surface until the complete snapshot exists.
4. The editable session is mounted beneath a `key` based on selected page
   identity. Its initial document state is initialized synchronously from the
   snapshot; Effects are reserved for synchronization with external systems.

This is simpler than coordinating several feature-level queries and makes the
backend transaction, client readiness state, and intended visual reveal the
same boundary.

Authenticated server preloading can later eliminate the initial client query
wait while retaining reactivity. It is an optimization, not required for
correctness, and Convex currently labels its general Next.js server-rendering
support beta. The cohesive reactive query and explicit readiness boundary are
therefore the stable foundation.

## Evidence and decisions

### Pass the initial auth token from the server

Convex Better Auth's official Next.js setup exports `getToken` from its server
utilities and shows passing that value to `ConvexBetterAuthProvider` through
its `initialToken` prop. This is the supported way to avoid beginning client
subscriptions in a temporarily unauthenticated state. Next.js explicitly
supports passing serializable values from Server Components to Client
Components and recommends rendering providers as deep as practical.

- [Convex Better Auth: Next.js](https://labs.convex.dev/better-auth/framework-guides/next)
- [Next.js: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)

The token handoff speeds authentication establishment; authorization must
still be enforced in every Convex query and mutation.

### Combine queries when the result is one domain view

Convex guarantees that all database reads inside one query occur at the same
logical timestamp. Its React client also guarantees that separate live query
subscriptions are updated together to a consistent database snapshot. Separate
`useQuery` hooks are therefore not inherently unsafe.

However, `useQueries` is documented primarily for a dynamic number of queries,
not as an atomic-reveal abstraction. When the UI always needs a fixed set of
values together, one aggregate query removes intermediate result combinations,
duplicates fewer permission/site reads, and gives the backend a cohesive DTO.
For this editor, the selected document and draft summary belong in the existing
workspace query rather than in sibling feature queries.

- [Convex: query caching, reactivity, and consistency](https://docs.convex.dev/functions/query-functions#caching--reactivity--consistency)
- [Convex React: consistency and reactive queries](https://docs.convex.dev/client/react/overview#consistency)
- [Convex React API: `useQueries`](https://docs.convex.dev/api/modules/react#usequeries)

If server preloading is introduced, the case for aggregation is stronger:
Convex documents that multiple `preloadQuery` calls use stateless HTTP clients
and are not guaranteed to observe one database state. One preloaded aggregate
query avoids that inconsistency.

- [Convex: Next.js server rendering](https://docs.convex.dev/client/nextjs/app-router/server-rendering#consistency)

### Make loading an explicit, atomic reveal boundary

`useQuery` returns `undefined` during its initial load and then maintains a live
subscription. The editor should translate that one pending value into its one
shell loading state and reveal the themed canvas only for a complete `ready`
snapshot. A missing query result must remain distinct from a pending result.

React Suspense can coordinate a reveal only when children actually suspend.
React explicitly says that fetching in Effects is not detected by Suspense;
ordinary Convex `useQuery` is likewise not a Suspense data source. Wrapping the
current hooks in arbitrary Suspense boundaries would not simplify the state
model. If authenticated server preloading is adopted, use the integration's
documented `preloadAuthQuery` and `usePreloadedAuthQuery` pair, which provides
the server result initially and retains a reactive client subscription.

- [Convex React API: `useQuery`](https://docs.convex.dev/api/modules/react#usequery)
- [React: Suspense and supported data sources](https://react.dev/reference/react/Suspense#what-activates-a-suspense-boundary)
- [Convex Better Auth: SSR with Server Components](https://labs.convex.dev/better-auth/framework-guides/next#ssr-with-server-components)

### Do not derive the editable document through an Effect

React says that data computable from current props or state should be derived
during render, not copied in an Effect. An Effect-driven reset first commits
stale state, then causes a second render. For conceptually different entities,
React recommends keying the stateful subtree so the state is reset as part of
rendering.

The editor should therefore initialize its local editable document
synchronously from the ready snapshot and key the editor session by page ID.
That guarantees a page switch cannot briefly render the previous page's local
draft. Remote updates to the same page are a genuine synchronization/conflict
problem and may use Effects or subscription logic; they should not be confused
with initial-state derivation or page-identity reset.

- [React: You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [React: Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state#option-2-resetting-state-with-a-key)

## Production-readiness checklist

- Keep exactly one shared `ConvexReactClient` across client-side navigation.
- Keep server token handoff in the deepest authenticated provider shared by the
  editor routes.
- Return one validated editor snapshot DTO and authorize it at the data source.
- Represent pending, missing/unauthorized, restoring, and ready explicitly;
  never interpret `undefined` as missing.
- Mount no themed canvas until `ready` contains the selected page document and
  every value required for its first paint.
- Key the stateful editor session by page identity and initialize its document
  synchronously.
- Preserve Convex subscriptions for post-mount updates; do not replace reactive
  reads with one-off server fetches.
- Treat authenticated preloading as an optional measured optimization and use
  a single aggregate preload if adopted.
