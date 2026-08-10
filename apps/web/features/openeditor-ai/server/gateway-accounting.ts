import {
  AI_CREDIT_UNITS_PER_USD,
  providerCostUsdToRetailCreditUnits,
} from "@baseblocks/domain";

export function gatewayUsdToProviderCostUnits(costUsd: number): bigint {
  if (!Number.isFinite(costUsd) || costUsd < 0) {
    throw new Error("AI Gateway returned an invalid generation cost");
  }
  const units = Math.ceil(costUsd * Number(AI_CREDIT_UNITS_PER_USD));
  if (!Number.isSafeInteger(units)) {
    throw new Error("AI Gateway generation cost exceeds accounting bounds");
  }
  return BigInt(units);
}

export const gatewayUsdToRetailCreditUnits = providerCostUsdToRetailCreditUnits;
