import { describe, expect, test } from "bun:test";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  replaceUnusedIncludedCreditLots,
  resolveBillingEnvironment,
  selectIncludedCreditLotsForReplacement,
} from "./aiCredits";

function lot(
  id: string,
  bucket: "included" | "prepaid",
  availableUnits: bigint,
) {
  return {
    _id: id,
    _creationTime: 0,
    organizationId: "org",
    bucket,
    sourceKind: bucket === "included" ? "recurring" : "purchase",
    sourceRef: id,
    grantedUnits: availableUnits,
    availableUnits,
    revokedUnits: 0n,
    spendPriority: bucket === "included" ? 0 : 1,
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"aiCreditLots">;
}

function replacementContext(
  lots: Doc<"aiCreditLots">[],
  account: Doc<"aiCreditAccounts">,
) {
  const ledgerEntries: unknown[] = [];
  const db = {
    query(table: string) {
      const chain = {
        eq: () => chain,
        unique: async () => (table === "aiCreditAccounts" ? account : null),
        collect: async () => (table === "aiCreditLots" ? lots : []),
      };
      return {
        withIndex: (
          _index: string,
          callback: (query: typeof chain) => unknown,
        ) => {
          callback(chain);
          return chain;
        },
      };
    },
    patch: async (id: unknown, value: Record<string, unknown>) => {
      if (id === account._id) Object.assign(account, value);
      const candidate = lots.find((item) => item._id === id);
      if (candidate) Object.assign(candidate, value);
    },
    insert: async (_table: string, value: unknown) => {
      ledgerEntries.push(value);
      return "ledger-entry";
    },
  };
  return { ctx: { db } as unknown as MutationCtx, ledgerEntries };
}

describe("included credit replacement", () => {
  test("replaces recurring grants while preserving prepaid funding", async () => {
    const monthly = lot("monthly", "included", 500_000n);
    const prepaid = lot("prepaid", "prepaid", 4_000_000n);
    const account = {
      _id: "account",
      availableIncludedUnits: 500_000n,
      version: 1,
    } as unknown as Doc<"aiCreditAccounts">;
    const state = replacementContext([monthly, prepaid], account);

    expect(
      await replaceUnusedIncludedCreditLots(state.ctx, {
        organizationId: "org",
        replacementRef: "annual-order",
        preserveSourceRef: "annual",
        policyVersion: "test",
        now: 1,
      }),
    ).toBe(500_000n);
    expect(monthly.availableUnits).toBe(0n);
    expect(prepaid.availableUnits).toBe(4_000_000n);
    expect(state.ledgerEntries).toEqual([
      expect.objectContaining({
        eventKind: "adjust",
        availableDeltaUnits: -500_000n,
      }),
    ]);
  });

  test("selects only unused recurring grants", () => {
    const spent = lot("spent", "included", 0n);
    const current = lot("current", "included", 500_000n);
    const old = lot("old", "included", 25n);
    const prepaid = lot("prepaid", "prepaid", 100n);
    expect(
      selectIncludedCreditLotsForReplacement([spent, current, old, prepaid], {
        excludeSourceRef: "current",
      }).map(({ lotId, units }) => [String(lotId), units]),
    ).toEqual([["old", 25n]]);
  });
});

describe("billing environment", () => {
  test("requires an explicit environment", () => {
    expect(resolveBillingEnvironment("sandbox")).toBe("sandbox");
    expect(() => resolveBillingEnvironment(undefined)).toThrow(
      "AI billing environment is not configured",
    );
  });
});
