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
  apiBaseUrl: string;
}>;

export type PolarConfigInput = Readonly<{
  environment: string | undefined;
  accessToken: string | undefined;
  webhookSecret: string | undefined;
  /** Production must be an explicit deployment decision, never a fallback. */
  allowProduction?: boolean;
}>;

const API_BASE_URLS: Record<PolarEnvironment, string> = {
  sandbox: "https://sandbox-api.polar.sh/v1",
  production: "https://api.polar.sh/v1",
};

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
    apiBaseUrl: API_BASE_URLS[input.environment],
  });
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
  getCustomerByEmail(email: string): Promise<PolarCustomer | null>;
  createCheckout(input: PolarCheckoutRequest): Promise<PolarCheckout>;
  getCheckout(checkoutId: string): Promise<PolarCheckout>;
  createCustomerPortalSession(
    customerId: string,
    returnUrl: string,
    externalMemberId?: string,
  ): Promise<PolarPortalSession>;
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

type Fetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export class PolarApiError extends Error {
  readonly status: number;
  readonly requestId: string | null;
  readonly retryAfter: string | null;

  constructor(response: Response, detail?: string) {
    super(
      `Polar API request failed with status ${response.status}${
        detail ? `: ${detail}` : ""
      }`,
    );
    this.name = "PolarApiError";
    this.status = response.status;
    this.requestId = response.headers.get("x-request-id");
    this.retryAfter = response.headers.get("retry-after");
  }

  get retryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

export function createPolarBillingProvider(
  config: PolarConfig,
  fetchImplementation: Fetch = globalThis.fetch,
): PolarBillingProvider {
  const request = async (
    path: string,
    init?: RequestInit,
  ): Promise<unknown> => {
    const response = await fetchImplementation(`${config.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        accept: "application/json",
        authorization: `Bearer ${config.accessToken}`,
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
    });
    if (!response.ok) {
      const payload = await response
        .clone()
        .json()
        .catch(() => null);
      const detail = polarErrorDetail(payload);
      throw new PolarApiError(response, detail);
    }
    return response.json();
  };

  const updateSubscription = async (
    subscriptionId: string,
    body: Record<string, unknown>,
  ) =>
    parsePolarSubscription(
      await request(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    );

  return {
    async createCustomer(input) {
      assertIdentifier(input.externalCustomerId, "externalCustomerId");
      if (input.metadata) assertMetadata(input.metadata);
      return mapCustomer(
        await request("/customers/", {
          method: "POST",
          body: JSON.stringify({
            type: "individual",
            external_id: input.externalCustomerId,
            email: input.email,
            name: input.name,
            metadata: input.metadata,
          }),
        }),
      );
    },

    async getCustomerByExternalId(externalCustomerId) {
      assertIdentifier(externalCustomerId, "externalCustomerId");
      return mapCustomer(
        await request(
          `/customers/external/${encodeURIComponent(externalCustomerId)}`,
        ),
      );
    },

    async getCustomerByEmail(email) {
      const normalizedEmail = email.trim().toLowerCase();
      const payload = object(
        await request(
          `/customers/?email=${encodeURIComponent(normalizedEmail)}`,
        ),
        "customer list",
      );
      const items = Array.isArray(payload.items) ? payload.items : [];
      const exact = items.filter((item) => {
        const customer = object(item, "customer");
        return (
          typeof customer.email === "string" &&
          customer.email.toLowerCase() === normalizedEmail
        );
      });
      if (exact.length > 1) {
        throw new Error("Polar returned duplicate customers for one email");
      }
      return exact[0] ? mapCustomer(exact[0]) : null;
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

      return mapCheckout(
        await request("/checkouts/", {
          method: "POST",
          body: JSON.stringify({
            products: input.productIds,
            customer_id: input.customerId,
            success_url: input.successUrl,
            return_url: input.returnUrl,
            metadata: input.metadata,
            amount: input.amountMinor,
            allow_discount_codes: input.allowDiscountCodes,
            seats: input.seats,
            customer_email: input.customerEmail,
            customer_name: input.customerName,
            locale: input.locale,
            allow_trial: false,
          }),
        }),
      );
    },

    async getCheckout(checkoutId) {
      assertIdentifier(checkoutId, "checkoutId");
      return mapCheckout(
        await request(`/checkouts/${encodeURIComponent(checkoutId)}`),
      );
    },

    async createCustomerPortalSession(customerId, returnUrl, externalMemberId) {
      assertIdentifier(customerId, "customerId");
      if (externalMemberId) {
        assertIdentifier(externalMemberId, "externalMemberId");
      }
      assertSafeRedirectUrl(returnUrl, "returnUrl");
      return mapPortalSession(
        await request("/customer-sessions/", {
          method: "POST",
          body: JSON.stringify({
            customer_id: customerId,
            external_member_id: externalMemberId,
            return_url: returnUrl,
          }),
        }),
      );
    },

    async getSubscription(subscriptionId) {
      assertIdentifier(subscriptionId, "subscriptionId");
      return parsePolarSubscription(
        await request(`/subscriptions/${encodeURIComponent(subscriptionId)}`),
      );
    },

    async updateSubscriptionSeats(subscriptionId, seats, prorationBehavior) {
      assertIdentifier(subscriptionId, "subscriptionId");
      assertSeats(seats);
      return updateSubscription(subscriptionId, {
        seats,
        proration_behavior: prorationBehavior,
      });
    },

    async setCancelAtPeriodEnd(subscriptionId, cancelAtPeriodEnd) {
      assertIdentifier(subscriptionId, "subscriptionId");
      return updateSubscription(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd,
      });
    },

    async revokeSubscription(subscriptionId) {
      assertIdentifier(subscriptionId, "subscriptionId");
      return updateSubscription(subscriptionId, { revoke: true });
    },
  };
}

function assertIdentifier(value: string, name: string): void {
  if (!value || value.length > 500) throw new Error(`${name} is invalid`);
}

function polarErrorDetail(payload: unknown): string | undefined {
  const value = optionalObject(payload);
  const direct = [value.detail, value.error, value.message].find(
    (candidate) => typeof candidate === "string",
  );
  if (typeof direct === "string") return direct.slice(0, 500);
  if (Array.isArray(value.detail)) {
    const messages = value.detail
      .flatMap((item) => {
        const issue = optionalObject(item);
        return typeof issue.msg === "string" ? [issue.msg] : [];
      })
      .slice(0, 3);
    if (messages.length) return messages.join("; ").slice(0, 500);
  }
  return undefined;
}

function assertSeats(seats: number): void {
  if (!Number.isSafeInteger(seats) || seats < 1 || seats > 10_000) {
    throw new Error("Polar seats must be an integer between 1 and 10000");
  }
}

function assertSafeRedirectUrl(value: string, name: string): void {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error(`${name} must be an HTTPS URL without credentials`);
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

type JsonObject = Record<string, unknown>;

function optionalObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

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

function mapCustomer(value: unknown): PolarCustomer {
  const data = object(value, "customer");
  return {
    id: string(data.id, "customer.id"),
    externalId: nullableString(data.external_id),
    email: nullableString(data.email),
    name: nullableString(data.name),
    type: data.type === "individual" || data.type === "team" ? data.type : null,
    modifiedAt: nullableString(data.modified_at),
  };
}

function mapCheckout(value: unknown): PolarCheckout {
  const data = object(value, "checkout");
  const url = string(data.url, "checkout.url");
  assertSafeRedirectUrl(url, "checkout.url");
  const expiresAt = string(data.expires_at, "checkout.expires_at");
  if (!Number.isFinite(Date.parse(expiresAt))) {
    throw new Error("Polar returned an invalid checkout expiration");
  }
  return {
    id: string(data.id, "checkout.id"),
    status: string(data.status, "checkout.status"),
    url,
    expiresAt,
    customerId: nullableString(data.customer_id),
    subscriptionId: nullableString(data.subscription_id),
    seats: typeof data.seats === "number" ? data.seats : null,
  };
}

function mapPortalSession(value: unknown): PolarPortalSession {
  const data = object(value, "customer portal session");
  const customerPortalUrl = string(
    data.customer_portal_url,
    "customer_session.customer_portal_url",
  );
  assertSafeRedirectUrl(
    customerPortalUrl,
    "customer_session.customer_portal_url",
  );
  return {
    id: string(data.id, "customer_session.id"),
    customerId: string(data.customer_id, "customer_session.customer_id"),
    customerPortalUrl,
    expiresAt: string(data.expires_at, "customer_session.expires_at"),
  };
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
  const expected = await hmacSha256(webhookSecret, signedContent);
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

async function hmacSha256(secret: string, content: string): Promise<string> {
  // Polar's SDK base64-encodes the configured secret before passing it to the
  // Standard Webhooks implementation; the resulting HMAC key is the raw UTF-8
  // secret entered in Polar's endpoint settings.
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
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
