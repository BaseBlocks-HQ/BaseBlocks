# Framework architecture audit

Date: 2026-08-10

This note records the primary-source rules used for the architecture refactor.

## Decisions

1. React Compiler is the default memoization strategy. Explicit `useMemo` and
   `useCallback` require an identity contract, a stable Effect dependency, or
   profiling evidence. They are not correctness tools.
   [React Compiler](https://react.dev/learn/react-compiler/introduction)
2. Effects synchronize with external systems. Derived state and user-triggered
   transitions belong in render, handlers, or a pure reducer/state machine.
   [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
3. Next.js client boundaries should be as narrow as the interactive feature
   permits because `"use client"` is transitive through its import graph.
   Convex live-query surfaces are legitimate client components.
   [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
4. Conditional dialogs should own separate modules when they are intended to
   form independent lazy-loaded chunks.
   [Next.js Lazy Loading](https://nextjs.org/docs/app/guides/lazy-loading)
5. Convex public functions are transport and security interfaces. Most domain
   implementation should live in plain TypeScript model modules.
   [Convex best practices](https://docs.convex.dev/understanding/best-practices)
6. External work should normally begin with a mutation that durably records or
   schedules intent. Direct actions remain appropriate when the caller needs an
   immediate external result, such as an authorization URL.
   [Convex actions](https://docs.convex.dev/functions/actions)
7. Growing Convex reads need an explicit index range and result bound. A
   `.filter()` does not reduce the scanned range.
   [Convex indexes](https://docs.convex.dev/database/reading-data/indexes/)
8. Package exports and discriminated unions should enforce module and workflow
   interfaces.
   [TypeScript module reference](https://www.typescriptlang.org/docs/handbook/modules/reference),
   [TypeScript narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing)

## Remaining BaseBlocks targets

- Extract document persistence, conflict, and rebase transitions from
  `use-versioned-page-document.ts` into a pure tested state machine.
- Split publish and history dialogs into separate source modules.
- Move implementation from large Convex public function files such as
  `aiChangesets.ts` and `libraries.ts` behind deep model interfaces while
  preserving required transaction boundaries.
- Audit broad `.collect()` calls, post-query filtering, and database operations
  that omit table names.
- Resolve the product vocabulary conflict between team, organization, and
  workspace.
- Measure high-level client roots and move static shaping below narrower client
  boundaries where Convex reactivity is not required.
