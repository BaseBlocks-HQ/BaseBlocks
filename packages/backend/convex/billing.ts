import { makeFunctionReference } from "convex/server";
import { ConvexError, v } from "convex/values";
import {
  AI_TOP_UP_DEFAULT_AMOUNT_MINOR,
  AI_TOP_UP_MIN_AMOUNT_MINOR,
  AI_TOP_UP_QUICK_AMOUNTS_MINOR,
  validateAiTopUpAmountMinor,
} from "@baseblocks/domain";
import type { Doc, Id } from "./_generated/dataModel";
import {
  action,
  type ActionCtx,
  internalAction,
  query,
} from "./_generated/server";
import {
  billingOperationMetadata,
  createPolarBillingProvider,
  executePolarCheckout,
  PolarApiError,
  polarConfigFromEnvironment,
  polarEnvironmentFromEnvironment,
  resolvePolarOrganizationCustomer,
  type PolarBillingProvider,
} from "./billing/polar";
import {
  checkOrganizationPermission,
  requireOrganizationMember,
  requireOrganizationPermission,
  type ServerAuthContext,
} from "./permissions";

type ProviderEnvironment = "sandbox" | "production";
type SeatSnapshot = {
  organizationId: string;
  memberIds: string[];
  billableSeatCount: number;
  membershipRevision: string;
};

const getCatalogItem = makeFunctionReference<
  "query",
  { providerEnvironment: ProviderEnvironment; sku: string },
  Doc<"billingCatalogItems"> | null
>("billingModel:getCatalogItem");
const getActiveSubscription = makeFunctionReference<
  "query",
  { organizationId: string; providerEnvironment: ProviderEnvironment },
  Doc<"billingSubscriptions"> | null
>("billingModel:getActiveSubscription");
const getCustomer = makeFunctionReference<
  "query",
  { organizationId: string; providerEnvironment: ProviderEnvironment },
  Doc<"billingCustomers"> | null
>("billingModel:getCustomer");
const listSeatReconciliationCandidates = makeFunctionReference<
  "query",
  { limit?: number },
  Array<Doc<"billingSubscriptions">>
>("billingModel:listSeatReconciliationCandidates");
const getSeatSnapshot = makeFunctionReference<
  "query",
  { organizationId: string },
  SeatSnapshot
>("workspaceBilling:getSeatSnapshot");
const createCheckoutIntent = makeFunctionReference<
  "mutation",
  {
    organizationId: string;
    actorId: string;
    providerEnvironment: ProviderEnvironment;
    purpose: "plus" | "aiCreditPack";
    sku: string;
    requestedSeats?: number;
    requestedAmountMinor?: bigint;
    idempotencyKey: string;
    attemptId: string;
  },
  Doc<"billingCheckoutIntents"> | null
>("billingModel:createCheckoutIntent");
const recordCheckoutCreated = makeFunctionReference<
  "mutation",
  {
    intentId: Id<"billingCheckoutIntents">;
    providerCheckoutId: string;
    expiresAt: number;
    attemptId: string;
  },
  null
>("billingModel:recordCheckoutCreated");
const recordCheckoutFailed = makeFunctionReference<
  "mutation",
  {
    intentId: Id<"billingCheckoutIntents">;
    failureCode: string;
    attemptId: string;
    retryable: boolean;
    retryAfterMs?: number;
  },
  null
>("billingModel:recordCheckoutFailed");
const recordCustomer = makeFunctionReference<
  "mutation",
  {
    organizationId: string;
    providerEnvironment: ProviderEnvironment;
    providerCustomerId: string;
    externalCustomerId: string;
  },
  null
>("billingModel:recordCustomer");
const recordSeatSnapshot = makeFunctionReference<
  "mutation",
  {
    organizationId: string;
    subscriptionId?: Id<"billingSubscriptions">;
    membershipRevision: string;
    memberIds: string[];
    billableSeatCount: number;
    source: "checkout" | "membership" | "webhook" | "reconcile";
  },
  Id<"billingSeatSnapshots">
>("billingModel:recordSeatSnapshot");
const createSeatSyncOperation = makeFunctionReference<
  "mutation",
  {
    organizationId: string;
    subscriptionId: Id<"billingSubscriptions">;
    membershipRevision: string;
    previousSeats: number;
    targetSeats: number;
    idempotencyKey: string;
  },
  Doc<"billingSeatSyncOperations"> | null
>("billingModel:createSeatSyncOperation");
const completeSeatSyncOperation = makeFunctionReference<
  "mutation",
  { operationId: Id<"billingSeatSyncOperations">; providerModifiedAt: number },
  null
>("billingModel:completeSeatSyncOperation");
const failSeatSyncOperation = makeFunctionReference<
  "mutation",
  { operationId: Id<"billingSeatSyncOperations">; failureCode: string },
  null
>("billingModel:failSeatSyncOperation");
const terminateSubscriptionForWorkspaceDeletion = makeFunctionReference<
  "mutation",
  {
    organizationId: string;
    subscriptionId: Id<"billingSubscriptions">;
    providerStatus: string;
    providerModifiedAt: number;
    endedAt?: number;
  },
  null
>("billingModel:terminateSubscriptionForWorkspaceDeletion");

function billingEnvironment(): ProviderEnvironment {
  try {
    return polarEnvironmentFromEnvironment();
  } catch {
    throw new ConvexError({
      code: "BILLING_NOT_CONFIGURED",
      message: "Billing environment is not explicitly configured",
    });
  }
}

function provider(): PolarBillingProvider {
  return createPolarBillingProvider(polarConfigFromEnvironment());
}

function validateOperationKey(value: string): string {
  const normalized = value.trim();
  if (normalized.length < 16 || normalized.length > 200) {
    throw new ConvexError({
      code: "INVALID_IDEMPOTENCY_KEY",
      message: "Billing idempotency keys must contain 16 to 200 characters",
    });
  }
  return normalized;
}

function validateAppUrl(value: string): string {
  const url = new URL(value);
  const configuredOrigin = process.env.BASEBLOCKS_APP_ORIGIN;
  if (!configuredOrigin || url.origin !== new URL(configuredOrigin).origin) {
    throw new ConvexError({
      code: "INVALID_BILLING_REDIRECT",
      message: "Billing redirects must use the configured application origin",
    });
  }
  return url.toString();
}

async function ensureCustomer(
  ctx: ActionCtx,
  polar: PolarBillingProvider,
  environment: ProviderEnvironment,
  organizationId: string,
  auth: ServerAuthContext,
) {
  // The portal represents the workspace billing account. Application
  // authorization decides which workspace admins may request this owner session.
  const ownerExternalId = organizationId;
  const existing = await ctx.runQuery(getCustomer, {
    organizationId,
    providerEnvironment: environment,
  });
  if (existing) {
    if (existing.externalCustomerId === organizationId) {
      return {
        providerCustomerId: existing.providerCustomerId,
        externalCustomerId: organizationId,
        ownerExternalId,
      };
    }
  }
  if (!auth.email) {
    throw new ConvexError({
      code: "BILLING_EMAIL_REQUIRED",
      message: "A verified account email is required to manage billing",
    });
  }
  const customer = await resolvePolarOrganizationCustomer(polar, {
    externalCustomerId: organizationId,
    email: auth.email,
    ownerExternalId,
    name: auth.name,
    metadata: billingOperationMetadata({
      workspaceId: organizationId,
      operationKey: `customer:${organizationId}`,
      purpose: "plus_subscription",
    }),
  });
  await ctx.runMutation(recordCustomer, {
    organizationId,
    providerEnvironment: environment,
    providerCustomerId: customer.id,
    externalCustomerId: organizationId,
  });
  return {
    providerCustomerId: customer.id,
    externalCustomerId: organizationId,
    ownerExternalId,
  };
}

type BillingFailure = Readonly<{
  code: string;
  retryable: boolean;
  retryAfterMs?: number;
}>;

function classifyBillingFailure(error: unknown): BillingFailure {
  if (error instanceof PolarApiError) {
    if (error.status === 401 || error.status === 403) {
      return {
        code: "PROVIDER_AUTHENTICATION",
        retryable: true,
        retryAfterMs: 1_000,
      };
    }
    if (error.status === 429) {
      return {
        code: "PROVIDER_RATE_LIMITED",
        retryable: true,
        retryAfterMs: 15_000,
      };
    }
    if (error.status >= 500 || error.status === 408) {
      return {
        code: "PROVIDER_UNAVAILABLE",
        retryable: true,
        retryAfterMs: 5_000,
      };
    }
    return { code: "PROVIDER_REJECTED", retryable: false };
  }
  return {
    code: "BILLING_OPERATION_FAILED",
    retryable: true,
    retryAfterMs: 5_000,
  };
}

function publicBillingError(failure: BillingFailure): ConvexError<{
  code: string;
  message: string;
}> {
  if (failure.code === "PROVIDER_AUTHENTICATION") {
    return new ConvexError({
      code: "BILLING_PROVIDER_UNAVAILABLE",
      message:
        "Billing provider authentication is unavailable. Try again after configuration is repaired.",
    });
  }
  return new ConvexError({
    code: failure.retryable
      ? "BILLING_TEMPORARILY_UNAVAILABLE"
      : "BILLING_REQUEST_REJECTED",
    message: failure.retryable
      ? "Billing is temporarily unavailable. Please try again."
      : "The billing provider rejected this request.",
  });
}

export const getWorkspaceEntitlements = query({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) => {
    await requireOrganizationMember(ctx, organizationId);
    const [entitlement, creditAccount, canManageBilling] = await Promise.all([
      ctx.db
        .query("workspaceEntitlements")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId),
        )
        .unique(),
      ctx.db
        .query("aiCreditAccounts")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId),
        )
        .unique(),
      checkOrganizationPermission(ctx, organizationId, {
        resource: "organization",
        action: "update",
      }),
    ]);
    const availableUnits = creditAccount
      ? creditAccount.availableIncludedUnits +
        creditAccount.availablePrepaidUnits
      : 0n;
    return {
      plan: entitlement?.plan ?? ("free" as const),
      subscriptionState: entitlement?.subscriptionStatus ?? ("none" as const),
      billableSeatCount: entitlement?.billableSeatCount ?? 1,
      paidSeatCapacity: entitlement?.paidSeatCapacity ?? 0,
      plusEnabled: entitlement?.plusEnabled ?? false,
      aiAdmissionAvailable: availableUnits > 0n,
      availableAiCreditUnits: availableUnits,
      effectiveThrough: entitlement?.effectiveThrough,
      canManageBilling,
    };
  },
});

export const listBillingOptions = query({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) => {
    await requireOrganizationMember(ctx, organizationId);
    let providerEnvironment: ProviderEnvironment;
    try {
      providerEnvironment = polarEnvironmentFromEnvironment();
    } catch {
      return [];
    }
    const items = await ctx.db
      .query("billingCatalogItems")
      .withIndex("by_environment_sku", (q) =>
        q.eq("providerEnvironment", providerEnvironment),
      )
      .collect();
    return items
      .filter((item) => item.active)
      .map((item) => ({
        sku: item.sku,
        kind: item.kind,
        recurringInterval: item.recurringInterval,
        priceAmountMinor: item.priceAmountMinor,
        currency: item.currency,
        creditUnits: item.creditUnits,
        ...(item.kind === "aiCreditPack"
          ? {
              minimumAmountMinor: AI_TOP_UP_MIN_AMOUNT_MINOR,
              defaultAmountMinor: AI_TOP_UP_DEFAULT_AMOUNT_MINOR,
              quickAmountsMinor: [...AI_TOP_UP_QUICK_AMOUNTS_MINOR],
            }
          : {}),
      }))
      .sort((left, right) => left.sku.localeCompare(right.sku));
  },
});

export const beginCheckout = action({
  args: {
    organizationId: v.string(),
    sku: v.string(),
    amountMinor: v.optional(v.int64()),
    idempotencyKey: v.string(),
    successUrl: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const { auth } = await requireOrganizationPermission(
      ctx,
      args.organizationId,
      {
        resource: "organization",
        action: "update",
      },
    );
    const environment = billingEnvironment();
    const catalog = await ctx.runQuery(getCatalogItem, {
      providerEnvironment: environment,
      sku: args.sku.trim(),
    });
    if (!catalog?.active) {
      throw new ConvexError({
        code: "SKU_UNAVAILABLE",
        message: "Billing item unavailable",
      });
    }
    let requestedAmountMinor: bigint | undefined;
    if (catalog.kind === "aiCreditPack") {
      try {
        requestedAmountMinor =
          args.amountMinor === undefined
            ? undefined
            : validateAiTopUpAmountMinor(args.amountMinor);
      } catch (error) {
        throw new ConvexError({
          code: "INVALID_AI_TOP_UP_AMOUNT",
          message:
            error instanceof Error ? error.message : "Invalid AI top-up amount",
        });
      }
    } else if (args.amountMinor !== undefined) {
      throw new ConvexError({
        code: "UNEXPECTED_CHECKOUT_AMOUNT",
        message: "Subscription checkout does not accept a custom amount",
      });
    }
    const idempotencyKey = validateOperationKey(args.idempotencyKey);
    const successUrl = validateAppUrl(args.successUrl);
    const returnUrl = validateAppUrl(args.returnUrl);
    if (!auth.email) {
      throw new ConvexError({
        code: "BILLING_EMAIL_REQUIRED",
        message: "A verified account email is required to manage billing",
      });
    }
    const seatSnapshot =
      catalog.kind === "plus"
        ? await ctx.runQuery(getSeatSnapshot, {
            organizationId: args.organizationId,
          })
        : undefined;
    if (
      seatSnapshot &&
      (seatSnapshot.organizationId !== args.organizationId ||
        seatSnapshot.billableSeatCount < 1 ||
        seatSnapshot.memberIds.length !== seatSnapshot.billableSeatCount ||
        new Set(seatSnapshot.memberIds).size !== seatSnapshot.billableSeatCount)
    ) {
      throw new Error("Workspace seat snapshot contract was violated");
    }
    const attemptId = crypto.randomUUID();
    const intent = await ctx.runMutation(createCheckoutIntent, {
      organizationId: args.organizationId,
      actorId: auth.userId,
      providerEnvironment: environment,
      purpose: catalog.kind,
      sku: catalog.sku,
      requestedSeats: seatSnapshot?.billableSeatCount,
      requestedAmountMinor,
      idempotencyKey,
      attemptId,
    });
    if (!intent) throw new Error("Checkout intent could not be persisted");
    if (intent.status === "failed") {
      throw publicBillingError({
        code: intent.failureCode ?? "BILLING_OPERATION_FAILED",
        retryable: false,
      });
    }
    if (intent.status === "retryable") {
      throw new ConvexError({
        code: "BILLING_RETRY_LATER",
        message: "This checkout can be retried shortly.",
      });
    }
    if (intent.status === "completed") {
      throw new ConvexError({
        code: "BILLING_CHECKOUT_COMPLETED",
        message: "This checkout has already completed.",
      });
    }
    if (intent.status === "pending" && intent.activeAttemptId !== attemptId) {
      throw new ConvexError({
        code: "BILLING_CHECKOUT_IN_PROGRESS",
        message: "This checkout is already being created.",
      });
    }
    try {
      const polar = provider();
      const customer = await ensureCustomer(
        ctx,
        polar,
        environment,
        args.organizationId,
        auth,
      );
      const result = await executePolarCheckout(polar, {
        providerCheckoutId: intent.providerCheckoutId,
        checkout: {
          productIds: [catalog.providerProductId],
          customerId: customer.providerCustomerId,
          successUrl,
          returnUrl,
          customerEmail: auth.email,
          customerName: auth.name,
          amountMinor:
            requestedAmountMinor === undefined
              ? undefined
              : Number(requestedAmountMinor),
          allowDiscountCodes: catalog.kind !== "aiCreditPack",
          seats: seatSnapshot?.billableSeatCount,
          metadata: {
            ...billingOperationMetadata({
              workspaceId: args.organizationId,
              operationKey: idempotencyKey,
              purpose:
                catalog.kind === "plus"
                  ? "plus_subscription"
                  : "ai_credit_pack",
            }),
            ...(requestedAmountMinor === undefined
              ? {}
              : {
                  baseblocks_requested_amount_minor:
                    Number(requestedAmountMinor),
                }),
          },
        },
      });
      const { checkout } = result;
      await ctx.runMutation(recordCheckoutCreated, {
        intentId: intent._id,
        providerCheckoutId: checkout.id,
        expiresAt: Date.parse(checkout.expiresAt),
        attemptId,
      });
      if (result.replay) {
        return { url: checkout.url, checkoutId: checkout.id, replay: true };
      }
      if (seatSnapshot) {
        await ctx.runMutation(recordSeatSnapshot, {
          organizationId: args.organizationId,
          membershipRevision: seatSnapshot.membershipRevision,
          memberIds: seatSnapshot.memberIds,
          billableSeatCount: seatSnapshot.billableSeatCount,
          source: "checkout",
        });
      }
      return { url: checkout.url, checkoutId: checkout.id, replay: false };
    } catch (error) {
      const failure = classifyBillingFailure(error);
      try {
        await ctx.runMutation(recordCheckoutFailed, {
          intentId: intent._id,
          failureCode: failure.code,
          attemptId,
          retryable: failure.retryable,
          retryAfterMs: failure.retryAfterMs,
        });
      } catch {
        throw new ConvexError({
          code: "BILLING_STATE_UNAVAILABLE",
          message:
            "Billing state could not be safely updated. Please try again.",
        });
      }
      throw publicBillingError(failure);
    }
  },
});

export const openCustomerPortal = action({
  args: { organizationId: v.string(), returnUrl: v.string() },
  handler: async (ctx, args) => {
    const { auth } = await requireOrganizationPermission(
      ctx,
      args.organizationId,
      {
        resource: "organization",
        action: "update",
      },
    );
    const environment = billingEnvironment();
    const returnUrl = validateAppUrl(args.returnUrl);
    try {
      const polar = provider();
      const customer = await ensureCustomer(
        ctx,
        polar,
        environment,
        args.organizationId,
        auth,
      );
      const session = await polar.createCustomerPortalSession({
        customerId: customer.providerCustomerId,
        externalMemberId: customer.ownerExternalId,
        returnUrl,
      });
      return { url: session.customerPortalUrl, expiresAt: session.expiresAt };
    } catch (error) {
      throw publicBillingError(classifyBillingFailure(error));
    }
  },
});

async function syncPaidSeatsForOrganization(
  ctx: ActionCtx,
  organizationId: string,
) {
  const environment = billingEnvironment();
  const [subscription, snapshot] = await Promise.all([
    ctx.runQuery(getActiveSubscription, {
      organizationId,
      providerEnvironment: environment,
    }),
    ctx.runQuery(getSeatSnapshot, { organizationId }),
  ]);
  if (!subscription) return { state: "notSubscribed" as const };
  if (
    snapshot.billableSeatCount < 1 ||
    snapshot.memberIds.length !== snapshot.billableSeatCount ||
    new Set(snapshot.memberIds).size !== snapshot.billableSeatCount
  ) {
    throw new Error("Workspace seat snapshot contract was violated");
  }
  await ctx.runMutation(recordSeatSnapshot, {
    organizationId,
    subscriptionId: subscription._id,
    membershipRevision: snapshot.membershipRevision,
    memberIds: snapshot.memberIds,
    billableSeatCount: snapshot.billableSeatCount,
    source: "membership",
  });
  if (subscription.seatQuantity === snapshot.billableSeatCount) {
    return { state: "unchanged" as const, seats: subscription.seatQuantity };
  }
  const idempotencyKey = `seat:${subscription.providerSubscriptionId}:${snapshot.membershipRevision}`;
  const operation = await ctx.runMutation(createSeatSyncOperation, {
    organizationId,
    subscriptionId: subscription._id,
    membershipRevision: snapshot.membershipRevision,
    previousSeats: subscription.seatQuantity,
    targetSeats: snapshot.billableSeatCount,
    idempotencyKey,
  });
  if (!operation) throw new Error("Seat sync operation could not be persisted");
  if (operation.status === "applied")
    return { state: "applied" as const, seats: operation.targetSeats };
  try {
    const polar = provider();
    const remote = await polar.getSubscription(
      subscription.providerSubscriptionId,
    );
    const updated =
      remote.seats === snapshot.billableSeatCount
        ? remote
        : await polar.updateSubscriptionSeats(
            subscription.providerSubscriptionId,
            snapshot.billableSeatCount,
            "prorate",
          );
    await ctx.runMutation(completeSeatSyncOperation, {
      operationId: operation._id,
      providerModifiedAt: Date.parse(
        updated.modifiedAt ?? new Date().toISOString(),
      ),
    });
    return {
      state: "applied" as const,
      seats: updated.seats ?? snapshot.billableSeatCount,
    };
  } catch (error) {
    await ctx.runMutation(failSeatSyncOperation, {
      operationId: operation._id,
      failureCode: error instanceof Error ? error.name : "UNKNOWN",
    });
    throw error;
  }
}

export const syncPaidSeats = action({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) => {
    await requireOrganizationPermission(ctx, organizationId, {
      resource: "member",
      action: "update",
    });
    return await syncPaidSeatsForOrganization(ctx, organizationId);
  },
});

export const syncPaidSeatsFromMembership = internalAction({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) =>
    await syncPaidSeatsForOrganization(ctx, organizationId),
});

export const setCancellation = action({
  args: { organizationId: v.string(), cancelAtPeriodEnd: v.boolean() },
  handler: async (ctx, args) => {
    await requireOrganizationPermission(ctx, args.organizationId, {
      resource: "organization",
      action: "update",
    });
    const environment = billingEnvironment();
    const subscription = await ctx.runQuery(getActiveSubscription, {
      organizationId: args.organizationId,
      providerEnvironment: environment,
    });
    if (!subscription) {
      throw new ConvexError({
        code: "SUBSCRIPTION_NOT_FOUND",
        message: "No active subscription",
      });
    }
    const updated = await provider().setCancelAtPeriodEnd(
      subscription.providerSubscriptionId,
      args.cancelAtPeriodEnd,
    );
    return {
      cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
      effectiveThrough: updated.cancelAtPeriodEnd
        ? updated.currentPeriodEnd
        : undefined,
    };
  },
});

export const revokeSubscriptionImmediately = action({
  args: {
    organizationId: v.string(),
    confirmation: v.literal("revokeImmediately"),
  },
  handler: async (ctx, args) => {
    await requireOrganizationPermission(ctx, args.organizationId, {
      resource: "organization",
      action: "update",
    });
    const subscription = await ctx.runQuery(getActiveSubscription, {
      organizationId: args.organizationId,
      providerEnvironment: billingEnvironment(),
    });
    if (!subscription) {
      throw new ConvexError({
        code: "SUBSCRIPTION_NOT_FOUND",
        message: "No active subscription",
      });
    }
    const revoked = await provider().revokeSubscription(
      subscription.providerSubscriptionId,
    );
    return { status: revoked.status, endedAt: revoked.endedAt };
  },
});

export const terminateWorkspaceBilling = action({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    await requireOrganizationPermission(ctx, args.organizationId, {
      resource: "organization",
      action: "delete",
    });
    const subscription = await ctx.runQuery(getActiveSubscription, {
      organizationId: args.organizationId,
      providerEnvironment: billingEnvironment(),
    });
    if (!subscription) return { state: "notSubscribed" as const };

    const revoked = await provider().revokeSubscription(
      subscription.providerSubscriptionId,
    );
    const providerModifiedAt = revoked.modifiedAt
      ? Date.parse(revoked.modifiedAt)
      : Date.now();
    const endedAt = revoked.endedAt ? Date.parse(revoked.endedAt) : Date.now();
    await ctx.runMutation(terminateSubscriptionForWorkspaceDeletion, {
      organizationId: args.organizationId,
      subscriptionId: subscription._id,
      providerStatus: revoked.status,
      providerModifiedAt: Number.isFinite(providerModifiedAt)
        ? providerModifiedAt
        : Date.now(),
      endedAt: Number.isFinite(endedAt) ? endedAt : Date.now(),
    });
    return { state: "terminated" as const };
  },
});

export const reconcilePaidSeats = internalAction({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const subscriptions = await ctx.runQuery(listSeatReconciliationCandidates, {
      limit: args.limit,
    });
    const polar = provider();
    let applied = 0;
    let unchanged = 0;
    let failed = 0;
    for (const subscription of subscriptions) {
      let operation: Doc<"billingSeatSyncOperations"> | null = null;
      try {
        const snapshot = await ctx.runQuery(getSeatSnapshot, {
          organizationId: subscription.organizationId,
        });
        if (
          snapshot.organizationId !== subscription.organizationId ||
          snapshot.billableSeatCount < 1 ||
          snapshot.memberIds.length !== snapshot.billableSeatCount ||
          new Set(snapshot.memberIds).size !== snapshot.billableSeatCount
        ) {
          throw new Error("Workspace seat snapshot contract was violated");
        }
        await ctx.runMutation(recordSeatSnapshot, {
          organizationId: subscription.organizationId,
          subscriptionId: subscription._id,
          membershipRevision: snapshot.membershipRevision,
          memberIds: snapshot.memberIds,
          billableSeatCount: snapshot.billableSeatCount,
          source: "reconcile",
        });
        operation = await ctx.runMutation(createSeatSyncOperation, {
          organizationId: subscription.organizationId,
          subscriptionId: subscription._id,
          membershipRevision: snapshot.membershipRevision,
          previousSeats: subscription.seatQuantity,
          targetSeats: snapshot.billableSeatCount,
          idempotencyKey: `seat:${subscription.providerSubscriptionId}:${snapshot.membershipRevision}`,
        });
        if (!operation)
          throw new Error("Seat sync operation could not be persisted");
        if (operation.status === "applied") {
          unchanged += 1;
          continue;
        }
        const remote = await polar.getSubscription(
          subscription.providerSubscriptionId,
        );
        const updated =
          remote.seats === snapshot.billableSeatCount
            ? remote
            : await polar.updateSubscriptionSeats(
                subscription.providerSubscriptionId,
                snapshot.billableSeatCount,
                "prorate",
              );
        await ctx.runMutation(completeSeatSyncOperation, {
          operationId: operation._id,
          providerModifiedAt: Date.parse(
            updated.modifiedAt ?? new Date().toISOString(),
          ),
        });
        if (remote.seats === snapshot.billableSeatCount) unchanged += 1;
        else applied += 1;
      } catch (error) {
        failed += 1;
        if (operation) {
          await ctx.runMutation(failSeatSyncOperation, {
            operationId: operation._id,
            failureCode: error instanceof Error ? error.name : "UNKNOWN",
          });
        }
      }
    }
    return { scanned: subscriptions.length, applied, unchanged, failed };
  },
});
