import { describe, expect, test } from "bun:test";
import {
  boundedCheckoutRetryAt,
  checkoutAttemptCanAcquire,
  checkoutAttemptShouldReplay,
  MAX_CHECKOUT_RETRY_DELAY_MS,
} from "./checkoutIntent";

describe("checkout intent lifecycle", () => {
  const now = 1_000_000;

  test("does not steal an active attempt lease", () => {
    expect(
      checkoutAttemptCanAcquire(
        {
          status: "pending",
          activeAttemptId: "attempt-a",
          leaseExpiresAt: now + 1,
        },
        "attempt-b",
        now,
      ),
    ).toBe(false);
  });

  test("recovers abandoned attempts after their lease expires", () => {
    expect(
      checkoutAttemptCanAcquire(
        {
          status: "pending",
          activeAttemptId: "attempt-a",
          leaseExpiresAt: now - 1,
        },
        "attempt-b",
        now,
      ),
    ).toBe(true);
  });

  test("acquires live provider checkouts for replay and recreates expired ones", () => {
    expect(
      checkoutAttemptCanAcquire(
        {
          status: "created",
          providerCheckoutId: "checkout-live",
          expiresAt: now + 1,
        },
        "attempt-b",
        now,
      ),
    ).toBe(true);
    expect(
      checkoutAttemptShouldReplay(
        {
          status: "created",
          providerCheckoutId: "checkout-live",
          expiresAt: now + 1,
        },
        now,
      ),
    ).toBe(true);
    expect(
      checkoutAttemptCanAcquire(
        {
          status: "created",
          providerCheckoutId: "checkout-expired",
          expiresAt: now - 1,
        },
        "attempt-b",
        now,
      ),
    ).toBe(true);
    expect(
      checkoutAttemptShouldReplay(
        {
          status: "created",
          providerCheckoutId: "checkout-expired",
          expiresAt: now - 1,
        },
        now,
      ),
    ).toBe(false);
  });

  test("respects retry timing and caps provider backoff", () => {
    expect(
      checkoutAttemptCanAcquire(
        { status: "retryable", nextAttemptAt: now + 1 },
        "attempt-b",
        now,
      ),
    ).toBe(false);
    expect(
      checkoutAttemptCanAcquire(
        { status: "retryable", nextAttemptAt: now },
        "attempt-b",
        now,
      ),
    ).toBe(true);
    expect(boundedCheckoutRetryAt(now, Number.MAX_SAFE_INTEGER)).toBe(
      now + MAX_CHECKOUT_RETRY_DELAY_MS,
    );
  });
});
