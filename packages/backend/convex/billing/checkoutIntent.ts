export const CHECKOUT_ATTEMPT_LEASE_MS = 2 * 60_000;
export const MAX_CHECKOUT_RETRY_DELAY_MS = 5 * 60_000;

export type CheckoutIntentLifecycle = Readonly<{
  status:
    | "pending"
    | "retryable"
    | "created"
    | "completed"
    | "expired"
    | "failed";
  providerCheckoutId?: string;
  expiresAt?: number;
  activeAttemptId?: string;
  leaseExpiresAt?: number;
  nextAttemptAt?: number;
}>;

export function checkoutAttemptCanAcquire(
  intent: CheckoutIntentLifecycle,
  attemptId: string,
  now: number,
): boolean {
  if (intent.status === "completed" || intent.status === "failed") return false;
  if (
    intent.status === "pending" &&
    intent.activeAttemptId !== attemptId &&
    (intent.leaseExpiresAt ?? 0) > now
  ) {
    return false;
  }
  if (intent.status === "retryable" && (intent.nextAttemptAt ?? 0) > now) {
    return false;
  }
  return true;
}

export function checkoutAttemptShouldReplay(
  intent: CheckoutIntentLifecycle,
  now: number,
): boolean {
  return Boolean(intent.providerCheckoutId && (intent.expiresAt ?? 0) > now);
}

export function boundedCheckoutRetryAt(
  now: number,
  requestedDelayMs: number | undefined,
): number {
  return (
    now +
    Math.max(
      0,
      Math.min(requestedDelayMs ?? 5_000, MAX_CHECKOUT_RETRY_DELAY_MS),
    )
  );
}
