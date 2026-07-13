# TypeScript 7 and Next.js

## Current workaround

This repository uses the native TypeScript 7 compiler. Next.js 16.2 still
expects the JavaScript compiler API at `typescript/lib/typescript.js`, but
TypeScript 7.0 intentionally ships only the native CLI and language server.

Until Next.js supports the native CLI in a non-canary release, the workspace:

- exposes the stable `typescript@7.0.2` package through the temporary
  `@typescript/native-preview` alias because Next 16.2 recognizes that package
  name when generating route declarations;
- sets `typescript.ignoreBuildErrors` in `apps/web/next.config.js` so Next does
  not try to load the unavailable JavaScript API; and
- runs `bun run check-types` before `next build`. GitHub Actions also requires
  the repository-wide typecheck before its build job.

The last point is the safety boundary: disabling Next's duplicate checker is
safe only while the standalone TypeScript 7 check is an unavoidable build and
deployment gate.

## What we are waiting for

Next.js added an experimental native CLI backend in
`16.3.0-canary.81` through `experimental.useTypeScriptCli`. It invokes the
project-local `tsc` instead of importing the legacy compiler API. As of
2026-07-13, the feature is present in the 16.3 canary line but not in
`16.3.0-preview.5` or the stable 16.2 line.

Do not remove the workaround merely because a newer Next version exists. The
cleanup criteria are:

1. A stable Next.js release, or a deliberately approved preview release,
   contains the native TypeScript CLI backend and documents TypeScript 7
   support.
2. With the alias and `ignoreBuildErrors` removed, `next typegen` recognizes
   the normal `typescript` package and `next build` runs TypeScript 7.
3. `bun run check-types`, `bun run lint`, `bun test`, and a production build all
   pass in this monorepo.
4. The build continues to fail on an intentional TypeScript error, confirming
   that local, CI, and Vercel builds cannot bypass type checking.

Track the upstream implementation in
[vercel/next.js#95639](https://github.com/vercel/next.js/pull/95639).

## Cleanup procedure

Once the criteria above are satisfied:

1. Upgrade Next.js and its workspace config dependency together.
2. Enable `experimental.useTypeScriptCli: true` if the supported release still
   requires the flag.
3. Remove `typescript.ignoreBuildErrors` from `apps/web/next.config.js`.
4. Remove the `@typescript/native-preview` alias from the root `package.json`.
5. Regenerate `bun.lock` and run the verification listed above.
6. Keep the explicit pre-build typecheck until Next's CLI integration has been
   validated on Vercel; afterward, remove the duplicate invocation only if all
   deployment paths remain type-gated.

