export const AI_CREDIT_UNITS_PER_USD = 1_000_000n;
export const AI_RETAIL_MARKUP_BPS = 2_500n;
export const AI_TOP_UP_MIN_AMOUNT_MINOR = 500n;
export const AI_TOP_UP_DEFAULT_AMOUNT_MINOR = 1_000n;
export const AI_TOP_UP_QUICK_AMOUNTS_MINOR = [500n, 1_000n, 2_000n] as const;

const BASIS_POINTS = 10_000n;
const MINOR_UNITS_PER_USD = 100n;

export function validateAiTopUpAmountMinor(amountMinor: bigint): bigint {
  if (amountMinor < AI_TOP_UP_MIN_AMOUNT_MINOR) {
    throw new RangeError("AI top-up amount must be at least $5");
  }
  return amountMinor;
}

export function aiTopUpAmountToCreditUnits(amountMinor: bigint): bigint {
  return moneyAmountMinorToCreditUnits(validateAiTopUpAmountMinor(amountMinor));
}

export function moneyAmountMinorToCreditUnits(amountMinor: bigint): bigint {
  if (amountMinor < 0n) {
    throw new RangeError("Money amount cannot be negative");
  }
  return (amountMinor * AI_CREDIT_UNITS_PER_USD) / MINOR_UNITS_PER_USD;
}

export function providerCostUsdToRetailCreditUnits(costUsd: number): bigint {
  if (!Number.isFinite(costUsd) || costUsd < 0) {
    throw new Error("AI Gateway returned an invalid generation cost");
  }
  const providerCostUnits = Math.ceil(
    costUsd * Number(AI_CREDIT_UNITS_PER_USD),
  );
  if (!Number.isSafeInteger(providerCostUnits)) {
    throw new Error("AI Gateway generation cost exceeds accounting bounds");
  }
  return (
    (BigInt(providerCostUnits) * (BASIS_POINTS + AI_RETAIL_MARKUP_BPS) +
      BASIS_POINTS -
      1n) /
    BASIS_POINTS
  );
}
