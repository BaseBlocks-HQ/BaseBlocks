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

Next.js added an experimental native CLI backend through
`experimental.useTypeScriptCli`. It invokes the project-local `tsc` instead of
importing the legacy compiler API. Although the upstream implementation
commit's demo identifies itself as `16.3.0-canary.81`, the published `.81` and
`.82` packages do not recognize the flag; `.83` is the first published package
verified with this repository. As of 2026-07-13, the feature is present in the
newer 16.3 canary line but not in `16.3.0-preview.5` or the stable 16.2 line.

Do not remove the workaround merely because a newer Next version exists. The
cleanup criteria are:

1. A stable Next.js release, or a deliberately approved preview release,
   contains the native TypeScript CLI backend and documents TypeScript 7
   support.
2. With the alias and `ignoreBuildErrors` removed, `next typegen` recognizes
   the normal `typescript` package and `next build` runs TypeScript 7.
3. Framework peers such as `next-intl` resolve the same Next.js version without
   a forced prerelease resolution or a release-age policy exception.
4. `bun run check-types`, `bun run lint`, `bun test`, and a production build all
   pass in this monorepo.
5. The build continues to fail on an intentional TypeScript error, confirming
   that local, CI, and Vercel builds cannot bypass type checking.

Track the upstream implementation in
[vercel/next.js#95639](https://github.com/vercel/next.js/pull/95639).

## Canary experiment (2026-07-13)

A disposable worktree tested `next@16.3.0-canary.83` with the workaround
removed and this replacement configuration:

```js
experimental: {
  useTypeScriptCli: true,
},
```

The experiment also restored the web build script to `next build` and removed
the `@typescript/native-preview` alias. Three forced clean production builds
were run for stable and canary on the same machine and source revision:

| Metric | Next 16.2.10 | Next 16.3.0-canary.83 | Difference |
| --- | ---: | ---: | ---: |
| Average complete build | 13.09s | 11.72s | 10.5% faster |
| Median complete build | 12.71s | 11.82s | 7.0% faster |
| Average compilation | 8.97s | 7.37s | 17.8% faster |
| Shared initial JS (gzip) | 167.7 KiB | 164.3 KiB | 2.0% smaller |
| Complete `.next` output | 91.6 MiB | 90.1 MiB | 1.7% smaller |

The canary's integrated native TypeScript check averaged 0.85 seconds. Its
aggregate static JavaScript was about 31% smaller, but that number sums every
route and generated chunk and is not representative of a single page load;
the 2% shared-initial-JavaScript change is the more conservative client metric.

The test exposed two blockers:

- the canary was newer than the repository's three-day minimum release age and
  required bypassing that supply-chain protection for the disposable test; and
- `next-intl` resolved a nested stable copy of Next because its peer range did
  not accept the prerelease. A forced `next` resolution and clean reinstall
  were required to avoid incompatible `NextRequest` types.

The result confirms that Next's CLI backend works and makes the configuration
cleaner, but the canary ecosystem is not ready for this production repository.
All experimental dependency, resolution, lockfile, config, and worktree changes
were discarded. Stable Next 16.2.10 and the guarded workaround remain in use.

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
