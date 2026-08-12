import { Polar } from "@polar-sh/sdk";

/**
 * Narrow, server-only Polar API boundary.
 *
 * Keep the organization access token in Convex/server environment variables.
 * Never serialize `PolarConfig` or return it to application clients.
 */

export type PolarEnvironment = "sandbox" | "production";

export type PolarConfig = Readonly<{
  environment: PolarEnvironment;
  accessToken: string;
  webhookSecret: string;
}>;

export type PolarConfigInput = Readonly<{
  environment: string | undefined;
  accessToken: string | undefined;
  webhookSecret: string | undefined;
  /** Production must be an explicit deployment decision, never a fallback. */
  allowProduction?: boolean;
}>;

type PolarEnvironmentVariables = Readonly<
  Partial<
    Record<
      | "BASEBLOCKS_BILLING_ENVIRONMENT"
      | "POLAR_ACCESS_TOKEN"
      | "POLAR_WEBHOOK_SECRET"
      | "POLAR_ALLOW_PRODUCTION",
      string | undefined
    >
  >
>;

export function createPolarConfig(input: PolarConfigInput): PolarConfig {
  if (input.environment !== "sandbox" && input.environment !== "production") {
    throw new Error(
      "POLAR_ENVIRONMENT must be explicitly set to sandbox or production",
    );
  }
  if (input.environment === "production" && input.allowProduction !== true) {
    throw new Error("Polar production access is not explicitly enabled");
  }

  const accessToken = requireSecret(input.accessToken, "POLAR_ACCESS_TOKEN");
  const webhookSecret = requireSecret(
    input.webhookSecret,
    "POLAR_WEBHOOK_SECRET",
  );

  return Object.freeze({
    environment: input.environment,
    accessToken,
    webhookSecret,
  });
}

/** The single environment-to-configuration boundary for every Polar caller. */
export function polarConfigFromEnvironment(
  environment: PolarEnvironmentVariables = process.env as PolarEnvironmentVariables,
): PolarConfig {
  return createPolarConfig({
    environment: environment.BASEBLOCKS_BILLING_ENVIRONMENT,
    accessToken: environment.POLAR_ACCESS_TOKEN,
    webhookSecret: environment.POLAR_WEBHOOK_SECRET,
    allowProduction: environment.POLAR_ALLOW_PRODUCTION === "true",
  });
}

export function polarEnvironmentFromEnvironment(
  environment: Pick<
    PolarEnvironmentVariables,
    "BASEBLOCKS_BILLING_ENVIRONMENT"
  > = process.env as PolarEnvironmentVariables,
): PolarEnvironment {
  const value = environment.BASEBLOCKS_BILLING_ENVIRONMENT;
  if (value !== "sandbox" && value !== "production") {
    throw new Error(
      "BASEBLOCKS_BILLING_ENVIRONMENT must be explicitly set to sandbox or production",
    );
  }
  return value;
}

function requireSecret(value: string | undefined, name: string): string {
  if (!value || value.trim().length < 8) {
    throw new Error(`${name} is missing or invalid`);
  }
  return value;
}

export type PolarMetadataValue = string | number | boolean;
export type PolarMetadata = Record<string, PolarMetadataValue>;

export type BillingOperationMetadata = Readonly<{
  workspaceId: string;
  operationKey: string;
  purpose: "plus_subscription" | "ai_credit_pack" | "seat_sync";
}>;

/**
 * Polar does not document a general idempotency header for these endpoints.
 * This metadata survives checkout -> order/subscription and lets the local
 * billing layer deduplicate semantic operations and reconcile responses.
 */
export function billingOperationMetadata(
  input: BillingOperationMetadata,
): PolarMetadata {
  const metadata = {
    baseblocks_workspace_id: input.workspaceId,
    baseblocks_operation_key: input.operationKey,
    baseblocks_purpose: input.purpose,
  } satisfies PolarMetadata;
  assertMetadata(metadata);
  return metadata;
}

export type PolarCheckoutRequest = Readonly<{
  productIds: readonly string[];
  customerId: string;
  successUrl: string;
  returnUrl: string;
  metadata: PolarMetadata;
  amountMinor?: number;
  allowDiscountCodes?: boolean;
  seats?: number;
  customerEmail?: string;
  customerName?: string;
  locale?: string;
}>;

export type PolarCheckout = Readonly<{
  id: string;
  status: "open" | "expired" | "confirmed" | "succeeded" | "failed" | string;
  url: string;
  expiresAt: string;
  customerId: string | null;
  subscriptionId: string | null;
  seats: number | null;
}>;

export type PolarCustomerRequest = Readonly<{
  externalCustomerId: string;
  email: string;
  ownerExternalId?: string;
  name?: string;
  locale?: string;
  metadata?: PolarMetadata;
}>;

export type PolarCustomer = Readonly<{
  id: string;
  externalId: string | null;
  email: string | null;
  name: string | null;
  type: "individual" | "team" | null;
  modifiedAt: string | null;
}>;

export type PolarPortalSession = Readonly<{
  id: string;
  customerId: string;
  customerPortalUrl: string;
  expiresAt: string;
}>;

export type PolarProrationBehavior = "invoice" | "prorate" | "next_period";

export type PolarSubscriptionStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused"
  | string;

export type PolarSubscription = Readonly<{
  id: string;
  customerId: string;
  productId: string;
  status: PolarSubscriptionStatus;
  seats: number | null;
  amount: number;
  currency: string;
  recurringInterval: string;
  recurringIntervalCount: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  endedAt: string | null;
  pastDueAt: string | null;
  pauseAtPeriodEnd: boolean;
  pausedAt: string | null;
  resumesAt: string | null;
  modifiedAt: string | null;
  metadata: PolarMetadata;
  pendingUpdate: unknown | null;
}>;

export type NormalizedSubscriptionState =
  | "pending"
  | "entitled"
  | "grace"
  | "suspended"
  | "terminated"
  | "unknown";

export type NormalizedSubscriptionLifecycle = Readonly<{
  state: NormalizedSubscriptionState;
  scheduledCancellation: boolean;
  scheduledPause: boolean;
  effectiveThrough: string | null;
}>;

/** Trials are intentionally non-entitling: BaseBlocks has no AI/Plus trial. */
export function normalizeSubscriptionLifecycle(
  subscription: Pick<
    PolarSubscription,
    | "status"
    | "cancelAtPeriodEnd"
    | "pauseAtPeriodEnd"
    | "currentPeriodEnd"
    | "endedAt"
  >,
): NormalizedSubscriptionLifecycle {
  let state: NormalizedSubscriptionState;
  switch (subscription.status) {
    case "active":
      state = "entitled";
      break;
    case "past_due":
      state = "grace";
      break;
    case "unpaid":
    case "paused":
      state = "suspended";
      break;
    case "incomplete":
    case "trialing":
      state = "pending";
      break;
    case "incomplete_expired":
    case "canceled":
      state = "terminated";
      break;
    default:
      state = "unknown";
  }

  return {
    state,
    scheduledCancellation: subscription.cancelAtPeriodEnd,
    scheduledPause: subscription.pauseAtPeriodEnd,
    effectiveThrough:
      subscription.endedAt ??
      (subscription.cancelAtPeriodEnd || subscription.pauseAtPeriodEnd
        ? subscription.currentPeriodEnd
        : null),
  };
}

export interface PolarBillingProvider {
  createCustomer(input: PolarCustomerRequest): Promise<PolarCustomer>;
  getCustomerByExternalId(externalCustomerId: string): Promise<PolarCustomer>;
  createCheckout(input: PolarCheckoutRequest): Promise<PolarCheckout>;
  getCheckout(checkoutId: string): Promise<PolarCheckout>;
  createCustomerPortalSession(input: {
    customerId: string;
    externalMemberId: string;
    returnUrl: string;
  }): Promise<PolarPortalSession>;
  getSubscription(subscriptionId: string): Promise<PolarSubscription>;
  updateSubscriptionSeats(
    subscriptionId: string,
    seats: number,
    prorationBehavior: PolarProrationBehavior,
  ): Promise<PolarSubscription>;
  setCancelAtPeriodEnd(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean,
  ): Promise<PolarSubscription>;
  revokeSubscription(subscriptionId: string): Promise<PolarSubscription>;
}

export async function resolvePolarOrganizationCustomer(
  provider: PolarBillingProvider,
  input: PolarCustomerRequest,
): Promise<PolarCustomer> {
  try {
    return await provider.getCustomerByExternalId(input.externalCustomerId);
  } catch (error) {
    if (!(error instanceof PolarApiError) || error.status !== 404) throw error;
  }
  try {
    return await provider.createCustomer(input);
  } catch (error) {
    // A concurrent request can win creation because external IDs are unique.
    if (!(error instanceof PolarApiError) || error.status !== 409) throw error;
    return await provider.getCustomerByExternalId(input.externalCustomerId);
  }
}

export async function executePolarCheckout(
  provider: PolarBillingProvider,
  input: Readonly<{
    providerCheckoutId?: string;
    checkout: PolarCheckoutRequest;
  }>,
): Promise<Readonly<{ checkout: PolarCheckout; replay: boolean }>> {
  if (input.providerCheckoutId) {
    return {
      checkout: await provider.getCheckout(input.providerCheckoutId),
      replay: true,
    };
  }
  return {
    checkout: await provider.createCheckout(input.checkout),
    replay: false,
  };
}

export class PolarApiError extends Error {
  readonly status: number;
  readonly requestId: string | null;
  readonly retryAfter: string | null;

  constructor(status: number, requestId: string | null = null) {
    super(`Polar API request failed with status ${status}`);
    this.name = "PolarApiError";
    this.status = status;
    this.requestId = requestId;
    this.retryAfter = null;
  }

  get retryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

export function createPolarBillingProvider(
  config: PolarConfig,
  sdk: Polar = new Polar({
    accessToken: config.accessToken,
    server: config.environment,
    retryConfig: { strategy: "none" },
  }),
): PolarBillingProvider {
  const call = async <T>(operation: () => Promise<T>): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      const status = sdkErrorStatus(error);
      if (status !== null) throw new PolarApiError(status, sdkRequestId(error));
      throw error;
    }
  };

  return {
    async createCustomer(input) {
      assertIdentifier(input.externalCustomerId, "externalCustomerId");
      if (input.metadata) assertMetadata(input.metadata);
      return mapSdkCustomer(
        await call(() =>
          sdk.customers.create({
            type: "team",
            externalId: input.externalCustomerId,
            name: input.name,
            owner: {
              email: input.email,
              name: input.name,
              externalId: input.ownerExternalId,
            },
            locale: input.locale,
            metadata: input.metadata,
          }),
        ),
      );
    },

    async getCustomerByExternalId(externalCustomerId) {
      assertIdentifier(externalCustomerId, "externalCustomerId");
      return mapSdkCustomer(
        await call(() =>
          sdk.customers.getExternal({ externalId: externalCustomerId }),
        ),
      );
    },

    async createCheckout(input) {
      if (input.productIds.length === 0) {
        throw new Error("At least one Polar product is required");
      }
      input.productIds.forEach((id) => {
        assertIdentifier(id, "productId");
      });
      assertIdentifier(input.customerId, "customerId");
      assertSafeRedirectUrl(input.successUrl, "successUrl");
      assertSafeRedirectUrl(input.returnUrl, "returnUrl");
      assertMetadata(input.metadata);
      if (input.seats !== undefined) assertSeats(input.seats);
      if (
        input.amountMinor !== undefined &&
        (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 0)
      ) {
        throw new RangeError("Checkout amount must be a non-negative integer");
      }

      return mapSdkCheckout(
        await call(() =>
          sdk.checkouts.create({
            products: [...input.productIds],
            customerId: input.customerId,
            successUrl: input.successUrl,
            returnUrl: input.returnUrl,
            metadata: input.metadata,
            amount: input.amountMinor,
            allowDiscountCodes: input.allowDiscountCodes,
            seats: input.seats,
            customerEmail: input.customerEmail,
            customerName: input.customerName,
            locale: input.locale,
            allowTrial: false,
          }),
        ),
      );
    },

    async getCheckout(checkoutId) {
      assertIdentifier(checkoutId, "checkoutId");
      return mapSdkCheckout(
        await call(() => sdk.checkouts.get({ id: checkoutId })),
      );
    },

    async createCustomerPortalSession(input) {
      assertIdentifier(input.customerId, "customerId");
      assertIdentifier(input.externalMemberId, "externalMemberId");
      assertSafeRedirectUrl(input.returnUrl, "returnUrl");
      const providerReturnUrl = new URL(input.returnUrl).protocol === "https:";
      return mapSdkPortalSession(
        await call(() =>
          sdk.customerSessions.create({
            customerId: input.customerId,
            externalMemberId: input.externalMemberId,
            ...(providerReturnUrl ? { returnUrl: input.returnUrl } : {}),
          }),
        ),
      );
    },

    async getSubscription(subscriptionId) {
      assertIdentifier(subscriptionId, "subscriptionId");
      return mapSdkSubscription(
        await call(() => sdk.subscriptions.get({ id: subscriptionId })),
      );
    },

    async updateSubscriptionSeats(subscriptionId, seats, prorationBehavior) {
      assertIdentifier(subscriptionId, "subscriptionId");
      assertSeats(seats);
      return mapSdkSubscription(
        await call(() =>
          sdk.subscriptions.update({
            id: subscriptionId,
            subscriptionUpdate: { seats, prorationBehavior },
          }),
        ),
      );
    },

    async setCancelAtPeriodEnd(subscriptionId, cancelAtPeriodEnd) {
      assertIdentifier(subscriptionId, "subscriptionId");
      return mapSdkSubscription(
        await call(() =>
          sdk.subscriptions.update({
            id: subscriptionId,
            subscriptionUpdate: { cancelAtPeriodEnd },
          }),
        ),
      );
    },

    async revokeSubscription(subscriptionId) {
      assertIdentifier(subscriptionId, "subscriptionId");
      return mapSdkSubscription(
        await call(() => sdk.subscriptions.revoke({ id: subscriptionId })),
      );
    },
  };
}

function assertIdentifier(value: string, name: string): void {
  if (!value || value.length > 500) throw new Error(`${name} is invalid`);
}

function assertSeats(seats: number): void {
  if (!Number.isSafeInteger(seats) || seats < 1 || seats > 1_000) {
    throw new Error("Polar seats must be an integer between 1 and 1000");
  }
}

function assertSafeRedirectUrl(value: string, name: string): void {
  const url = new URL(value);
  const localHttp =
    url.protocol === "http:" &&
    (url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1");
  if (
    (url.protocol !== "https:" && !localHttp) ||
    url.username ||
    url.password
  ) {
    throw new Error(
      `${name} must be HTTPS, or HTTP on localhost, without credentials`,
    );
  }
}

function assertMetadata(metadata: PolarMetadata): void {
  const entries = Object.entries(metadata);
  if (entries.length > 50) throw new Error("Polar metadata has too many keys");
  for (const [key, value] of entries) {
    if (!key || key.length > 40)
      throw new Error("Polar metadata key is invalid");
    if (typeof value === "string" && (!value || value.length > 500)) {
      throw new Error(`Polar metadata value for ${key} is invalid`);
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error(`Polar metadata value for ${key} is invalid`);
    }
  }
}

function sdkErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const status = "statusCode" in error ? error.statusCode : undefined;
  return typeof status === "number" && Number.isInteger(status) ? status : null;
}

function sdkRequestId(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("headers" in error)) return null;
  const headers = error.headers;
  return headers instanceof Headers ? headers.get("x-request-id") : null;
}

function mapSdkCustomer(
  customer: Awaited<ReturnType<Polar["customers"]["create"]>>,
): PolarCustomer {
  return {
    id: customer.id,
    externalId: customer.externalId ?? null,
    email: customer.email ?? null,
    name: customer.name,
    type: customer.type,
    modifiedAt: customer.modifiedAt?.toISOString() ?? null,
  };
}

function mapSdkCheckout(
  checkout: Awaited<ReturnType<Polar["checkouts"]["create"]>>,
): PolarCheckout {
  assertSafeRedirectUrl(checkout.url, "checkout.url");
  return {
    id: checkout.id,
    status: checkout.status,
    url: checkout.url,
    expiresAt: checkout.expiresAt.toISOString(),
    customerId: checkout.customerId,
    subscriptionId: checkout.subscriptionId,
    seats: checkout.seats ?? null,
  };
}

function mapSdkPortalSession(
  session: Awaited<ReturnType<Polar["customerSessions"]["create"]>>,
): PolarPortalSession {
  assertSafeRedirectUrl(session.customerPortalUrl, "customer portal URL");
  return {
    id: session.id,
    customerId: session.customerId,
    customerPortalUrl: session.customerPortalUrl,
    expiresAt: session.expiresAt.toISOString(),
  };
}

function mapSdkSubscription(
  subscription: Awaited<ReturnType<Polar["subscriptions"]["get"]>>,
): PolarSubscription {
  return {
    id: subscription.id,
    customerId: subscription.customerId,
    productId: subscription.productId,
    status: subscription.status,
    seats: subscription.seats ?? null,
    amount: subscription.amount,
    currency: subscription.currency,
    recurringInterval: subscription.recurringInterval,
    recurringIntervalCount: subscription.recurringIntervalCount,
    currentPeriodStart: subscription.currentPeriodStart.toISOString(),
    currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    canceledAt: subscription.canceledAt?.toISOString() ?? null,
    endedAt: subscription.endedAt?.toISOString() ?? null,
    pastDueAt: subscription.pastDueAt?.toISOString() ?? null,
    pauseAtPeriodEnd: subscription.pauseAtPeriodEnd,
    pausedAt: subscription.pausedAt?.toISOString() ?? null,
    resumesAt: subscription.resumesAt?.toISOString() ?? null,
    modifiedAt: subscription.modifiedAt?.toISOString() ?? null,
    metadata: subscription.metadata as PolarMetadata,
    pendingUpdate: subscription.pendingUpdate,
  };
}

type JsonObject = Record<string, unknown>;

function object(value: unknown, name: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Polar returned an invalid ${name}`);
  }
  return value as JsonObject;
}

function string(value: unknown, name: string): string {
  if (typeof value !== "string") throw new Error(`Polar omitted ${name}`);
  return value;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function parsePolarSubscription(value: unknown): PolarSubscription {
  const data = object(value, "subscription");
  const metadataValue = object(data.metadata ?? {}, "subscription metadata");
  return {
    id: string(data.id, "subscription.id"),
    customerId: string(data.customer_id, "subscription.customer_id"),
    productId: string(data.product_id, "subscription.product_id"),
    status: string(data.status, "subscription.status"),
    seats: typeof data.seats === "number" ? data.seats : null,
    amount: typeof data.amount === "number" ? data.amount : 0,
    currency: string(data.currency, "subscription.currency"),
    recurringInterval: string(
      data.recurring_interval,
      "subscription.recurring_interval",
    ),
    recurringIntervalCount:
      typeof data.recurring_interval_count === "number"
        ? data.recurring_interval_count
        : 1,
    currentPeriodStart: string(
      data.current_period_start,
      "subscription.current_period_start",
    ),
    currentPeriodEnd: string(
      data.current_period_end,
      "subscription.current_period_end",
    ),
    cancelAtPeriodEnd: data.cancel_at_period_end === true,
    canceledAt: nullableString(data.canceled_at),
    endedAt: nullableString(data.ended_at),
    pastDueAt: nullableString(data.past_due_at),
    pauseAtPeriodEnd: data.pause_at_period_end === true,
    pausedAt: nullableString(data.paused_at),
    resumesAt: nullableString(data.resumes_at),
    modifiedAt: nullableString(data.modified_at),
    metadata: metadataValue as PolarMetadata,
    pendingUpdate: data.pending_update ?? null,
  };
}

export type PolarWebhookHeaders =
  | Headers
  | Record<string, string | readonly string[] | undefined>;

export type VerifiedPolarWebhook = Readonly<{
  deliveryId: string;
  timestamp: number;
  payload: JsonObject;
}>;

export type VerifyPolarWebhookOptions = Readonly<{
  now?: number;
  toleranceSeconds?: number;
}>;

/**
 * Verifies Polar's Standard Webhooks signature against the unmodified body.
 * The caller must persist `deliveryId` uniquely to reject valid replays.
 */
export async function verifyPolarWebhook(
  rawBody: string,
  headers: PolarWebhookHeaders,
  webhookSecret: string | undefined,
  options: VerifyPolarWebhookOptions = {},
): Promise<VerifiedPolarWebhook | null> {
  if (!webhookSecret) return null;
  const deliveryId = header(headers, "webhook-id");
  const timestampHeader = header(headers, "webhook-timestamp");
  const signatureHeader = header(headers, "webhook-signature");
  if (!deliveryId || !timestampHeader || !signatureHeader) return null;

  const timestamp = Number(timestampHeader);
  if (!Number.isSafeInteger(timestamp)) return null;
  const now = options.now ?? Math.floor(Date.now() / 1000);
  const tolerance = options.toleranceSeconds ?? 300;
  if (tolerance < 0 || Math.abs(now - timestamp) > tolerance) return null;

  const signedContent = `${deliveryId}.${timestampHeader}.${rawBody}`;
  const signingKey = decodeWebhookSecret(webhookSecret);
  if (!signingKey) return null;
  const expected = await hmacSha256(signingKey, signedContent);
  const candidates = signatureHeader
    .split(" ")
    .map((part) => part.split(",", 2))
    .filter(([version, signature]) => version === "v1" && !!signature)
    .map(([, signature]) => signature as string);
  if (!candidates.some((candidate) => constantTimeEqual(candidate, expected))) {
    return null;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return null;
  }
  return { deliveryId, timestamp, payload: object(payload, "webhook payload") };
}

function decodeWebhookSecret(secret: string): ArrayBuffer | null {
  const encoded = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  try {
    const binary = atob(encoded);
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes.buffer;
  } catch {
    return null;
  }
}

async function hmacSha256(
  signingKey: ArrayBuffer,
  content: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    signingKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(content));
  return bytesToBase64(new Uint8Array(digest));
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function header(headers: PolarWebhookHeaders, name: string): string | null {
  if (headers instanceof Headers) return headers.get(name);
  const entry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === name,
  )?.[1];
  if (typeof entry === "string") return entry;
  return entry?.[0] ?? null;
}
