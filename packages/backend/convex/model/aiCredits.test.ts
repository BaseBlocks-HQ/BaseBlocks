import { describe, expect, test } from "bun:test";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  allocateCreditLots,
  replaceUnusedIncludedCreditLots,
  resolveBillingEnvironment,
  selectIncludedCreditLotsForReplacement,
} from "./aiCredits";

function lot(
  id: string,
  bucket: "included" | "prepaid",
  availableUnits: bigint,
  options: {
    expiresAt?: number;
    spendPriority?: number;
    createdAt?: number;
  } = {},
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
    reservedUnits: 0n,
    revokedUnits: 0n,
    spendPriority: options.spendPriority ?? (bucket === "included" ? 0 : 1),
    expiresAt: options.expiresAt,
    createdAt: options.createdAt ?? 0,
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
        take: async (limit: number) =>
          table === "aiCreditLots" ? lots.slice(0, limit) : [],
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
      const lotToPatch = lots.find((candidate) => candidate._id === id);
      if (lotToPatch) Object.assign(lotToPatch, value);
    },
    insert: async (_table: string, value: unknown) => {
      ledgerEntries.push(value);
      return "ledger-entry";
    },
  };
  return {
    ctx: { db } as unknown as MutationCtx,
    ledgerEntries,
  };
}

describe("AI credit allocation", () => {
  test("spends included expiring credits before prepaid credits", () => {
    const result = allocateCreditLots(
      [lot("prepaid", "prepaid", 100n), lot("included", "included", 40n)],
      70n,
      10,
    );
    expect(result.map(({ lotId, units }) => [String(lotId), units])).toEqual([
      ["included", 40n],
      ["prepaid", 30n],
    ]);
  });

  test("does not reserve a lot that expires before settlement lease", () => {
    expect(
      allocateCreditLots(
        [lot("included", "included", 100n, { expiresAt: 5 })],
        50n,
        10,
      ),
    ).toEqual([]);
  });

  test("fails closed rather than partially reserving", () => {
    expect(
      allocateCreditLots([lot("prepaid", "prepaid", 49n)], 50n, 10),
    ).toEqual([]);
  });
});

describe("included credit replacement", () => {
  test("mutates monthly annual monthly plans idempotently", async () => {
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
    expect(account.availableIncludedUnits).toBe(0n);
    expect(prepaid.availableUnits).toBe(4_000_000n);

    const annual = lot("annual", "included", 6_000_000n);
    Object.assign(account, { availableIncludedUnits: 6_000_000n });
    const lots = [monthly, prepaid, annual];
    const annualState = replacementContext(lots, account);
    expect(
      await replaceUnusedIncludedCreditLots(annualState.ctx, {
        organizationId: "org",
        replacementRef: "monthly-order",
        preserveSourceRef: "monthly-again",
        policyVersion: "test",
        now: 2,
      }),
    ).toBe(6_000_000n);
    expect(annual.availableUnits).toBe(0n);

    const monthlyAgain = lot("monthly-again", "included", 500_000n);
    lots.push(monthlyAgain);
    const replayState = replacementContext(lots, account);
    expect(
      await replaceUnusedIncludedCreditLots(replayState.ctx, {
        organizationId: "org",
        replacementRef: "monthly-order",
        preserveSourceRef: "monthly-again",
        policyVersion: "test",
        now: 3,
      }),
    ).toBe(0n);
    expect(monthlyAgain.availableUnits).toBe(500_000n);
    expect(prepaid.availableUnits).toBe(4_000_000n);
    expect(replayState.ledgerEntries).toEqual([]);
    expect(annualState.ledgerEntries).toHaveLength(1);
  });

  test("replaces recurring lots once while preserving prepaid packs", () => {
    const monthly = lot("monthly", "included", 500_000n, {
      createdAt: 1,
    });
    const prepaid = lot("prepaid", "prepaid", 4_000_000n, {
      createdAt: 2,
    });
    const annual = lot("annual", "included", 6_000_000n, {
      createdAt: 3,
    });

    const afterAnnual = selectIncludedCreditLotsForReplacement(
      [monthly, prepaid],
      { excludeSourceRef: "annual" },
    );
    expect(
      afterAnnual.map(({ lotId, units }) => [String(lotId), units]),
    ).toEqual([["monthly", 500_000n]]);

    const monthlyAgain = selectIncludedCreditLotsForReplacement(
      [{ ...monthly, availableUnits: 0n }, prepaid, annual],
      { excludeSourceRef: "monthly-again" },
    );
    expect(
      monthlyAgain.map(({ lotId, units }) => [String(lotId), units]),
    ).toEqual([["annual", 6_000_000n]]);

    const replay = selectIncludedCreditLotsForReplacement(
      [
        { ...monthly, availableUnits: 0n },
        prepaid,
        { ...annual, availableUnits: 0n },
        lot("monthly-again", "included", 500_000n),
      ],
      { excludeSourceRef: "monthly-again" },
    );
    expect(replay).toEqual([]);
    expect(prepaid.availableUnits).toBe(4_000_000n);
  });

  test("does not replace reserved units", () => {
    const reserved = {
      ...lot("reserved", "included", 25n),
      grantedUnits: 100n,
      availableUnits: 25n,
      reservedUnits: 75n,
    };
    expect(
      selectIncludedCreditLotsForReplacement([reserved], {
        excludeSourceRef: "different-current-lot",
      }).map(({ lotId, units }) => [String(lotId), units]),
    ).toEqual([["reserved", 25n]]);
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
