# Toolchain benchmark report

The comparison below uses the exact pre-change commit `f54b6083` and the
upgrade commit `3bc2ef7`. Each run used an isolated temporary worktree, a clean
`apps/web/.next` directory before typechecking and building, and the same
Apple M4 Pro host with 14 cores, macOS `27.0.0`, and arm64. The only runtime
change is Bun `1.3.14` to `1.4.0`.

TypeScript stayed at `7.0.2` because that is the current npm stable version.
The requested `7.2` version is not published. Both runs therefore measure the
same TypeScript compiler and show the expected small run-to-run variation.

| Measurement | Bun 1.3.14 | Bun 1.4.0 | Wall-time change | Peak RSS change |
| --- | ---: | ---: | ---: | ---: |
| Clean install | 2.041 s / 34.3 MiB | 1.739 s / 19.4 MiB | -14.8% | -43.4% |
| Warm install | 1.541 s / 36.2 MiB | 1.378 s / 19.8 MiB | -10.6% | -45.3% |
| Bun startup and CPU loop (median of 3) | 13.3 ms / 28.0 MiB | 9.3 ms / 17.1 MiB | -30.1% | -39.1% |
| TypeScript version startup | 395 ms / 16.1 MiB | 459 ms / 15.9 MiB | +16.2% | -1.4% |
| Repository typecheck | 4.887 s / 1,423.4 MiB | 4.779 s / 1,425.6 MiB | -2.2% | +0.2% |
| Biome validation | 0.769 s / 106.3 MiB | 0.790 s / 106.1 MiB | +2.7% | -0.1% |
| Repository tests | 0.808 s / 292.9 MiB | 0.748 s / 293.0 MiB | -7.4% | 0.0% |
| Repository build | 16.241 s / 3,276.5 MiB | 17.478 s / 3,104.2 MiB | +7.6% | -5.3% |
| SEO build and audit | 23.223 s / 3,363.9 MiB | 23.568 s / 3,307.7 MiB | +1.5% | -1.7% |

The clean and warm install rows use the global Bun package cache but create a
new dependency tree. The other expensive commands ran once, so the table is a
directional comparison rather than a statistically significant performance
claim. Peak RSS includes the repository’s Next.js build workers.

Pass status was identical for both versions:

- Install, Bun startup, TypeScript startup, typecheck, tests, and repository
  build passed.
- Biome validation failed because the existing `biome.jsonc` uses
  `tailwindDirectives` and `rules.preset`, which the resolved Biome `2.5.6`
  rejects. This PR does not change Biome.
- The SEO audit build completed, but the local audit failed at `/docs` because
  the docs page requested GitHub repository metadata without a valid
  `GITHUB_TOKEN`. Run the benchmark with a valid token to complete that audit.
