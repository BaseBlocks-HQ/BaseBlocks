export type PolarOrderAmounts = {
  subtotalMinor: bigint;
  discountMinor: bigint;
  taxMinor: bigint;
  grossMinor: bigint;
  netMinor: bigint;
  refundedGrossMinor: bigint;
};

function integerMinor(
  value: unknown,
  field: string,
  allowNegative = false,
): bigint {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    (!allowNegative && value < 0)
  ) {
    throw new Error(`Polar returned an invalid ${field}`);
  }
  return BigInt(value);
}

/**
 * Polar's `amount` and `net_amount` exclude tax. Customer-facing credit value
 * is based on the gross amount the customer paid, represented by
 * `total_amount`. Refunds likewise include both the net and tax portions.
 */
export function parsePolarOrderAmounts(
  data: Record<string, unknown>,
): PolarOrderAmounts {
  const subtotalMinor = integerMinor(
    data.subtotal_amount,
    "subtotal_amount",
    true,
  );
  const discountMinor = integerMinor(data.discount_amount, "discount_amount");
  const taxMinor = integerMinor(data.tax_amount, "tax_amount", true);
  const grossMinor = integerMinor(data.total_amount, "total_amount", true);
  const netMinor = integerMinor(data.net_amount, "net_amount", true);
  const refundedNetMinor = integerMinor(
    data.refunded_amount,
    "refunded_amount",
  );
  const refundedTaxMinor = integerMinor(
    data.refunded_tax_amount,
    "refunded_tax_amount",
  );

  if (grossMinor !== subtotalMinor - discountMinor) {
    throw new Error("Polar order total does not match subtotal minus discount");
  }
  if (netMinor + taxMinor !== grossMinor) {
    throw new Error("Polar order total does not match net plus tax");
  }

  return {
    subtotalMinor,
    discountMinor,
    taxMinor,
    grossMinor,
    netMinor,
    refundedGrossMinor: refundedNetMinor + refundedTaxMinor,
  };
}
