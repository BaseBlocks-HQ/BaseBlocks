"use client";

import { useTeamAccess } from "@/features/authentication/team-access";
import { api } from "@baseblocks/backend";
import { Spinner } from "@baseblocks/ui/spinner";
import { useAction, useConvexAuth, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BillingOverview } from "./billing-overview";

export function BillingPage() {
  const { team } = useTeamAccess();
  const { isAuthenticated } = useConvexAuth();
  const queryArgs = isAuthenticated ? { organizationId: team._id } : "skip";
  const entitlement = useQuery(api.billing.getWorkspaceEntitlements, queryArgs);
  const options = useQuery(api.billing.listBillingOptions, queryArgs);
  const beginCheckout = useAction(api.billing.beginCheckout);
  const openCustomerPortal = useAction(api.billing.openCustomerPortal);
  const [actionPending, setActionPending] = useState(false);
  const checkoutKeysRef = useRef(new Map<string, string>());
  const creditCheckoutKeysRef = useRef(new Map<string, string>());

  useEffect(() => {
    const url = new URL(window.location.href);
    if (
      !url.searchParams.has("checkout") &&
      !url.searchParams.has("customer_session_token")
    ) {
      return;
    }
    url.searchParams.delete("checkout");
    url.searchParams.delete("customer_session_token");
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, []);

  if (!isAuthenticated || entitlement === undefined || options === undefined) {
    return (
      <div className="grid min-h-64 place-items-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  const plusOptions = options.flatMap((option) =>
    option.kind === "plus" && option.recurringInterval
      ? [
          {
            sku: option.sku,
            recurringInterval: option.recurringInterval,
            priceAmountMinor: option.priceAmountMinor,
            currency: option.currency,
          },
        ]
      : [],
  );
  const creditTopUpOption = options.find(
    (option) =>
      option.kind === "aiCreditPack" &&
      option.minimumAmountMinor !== undefined &&
      option.quickAmountsMinor !== undefined,
  );
  const creditTopUp =
    creditTopUpOption?.minimumAmountMinor !== undefined &&
    creditTopUpOption.quickAmountsMinor !== undefined
      ? {
          sku: creditTopUpOption.sku,
          currency: creditTopUpOption.currency,
          minimumAmountMinor: creditTopUpOption.minimumAmountMinor,
          quickAmountsMinor: creditTopUpOption.quickAmountsMinor,
        }
      : undefined;

  async function redirectToBilling(action: () => Promise<{ url: string }>) {
    setActionPending(true);
    try {
      const result = await action();
      window.location.assign(result.url);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Billing request failed",
      );
      setActionPending(false);
    }
  }

  return (
    <BillingOverview
      actionPending={actionPending}
      canManageBilling={entitlement.canManageBilling}
      entitlement={entitlement}
      creditTopUp={creditTopUp}
      plusOptions={plusOptions}
      onCheckout={
        plusOptions.length > 0
          ? (sku) => {
              const checkoutKey =
                checkoutKeysRef.current.get(sku) ?? crypto.randomUUID();
              checkoutKeysRef.current.set(sku, checkoutKey);
              const returnUrl = window.location.href;
              void redirectToBilling(() =>
                beginCheckout({
                  organizationId: team._id,
                  sku,
                  idempotencyKey: checkoutKey,
                  successUrl: `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}checkout=success`,
                  returnUrl,
                }),
              );
            }
          : undefined
      }
      onOpenPortal={() => {
        void redirectToBilling(() =>
          openCustomerPortal({
            organizationId: team._id,
            returnUrl: window.location.href,
          }),
        );
      }}
      onCreditCheckout={
        entitlement.canManageBilling
          ? (sku, amountMinor) => {
              const operation = `${sku}:${amountMinor ?? "custom"}`;
              const checkoutKey =
                creditCheckoutKeysRef.current.get(operation) ??
                crypto.randomUUID();
              creditCheckoutKeysRef.current.set(operation, checkoutKey);
              const returnUrl = window.location.href;
              void redirectToBilling(() =>
                beginCheckout({
                  organizationId: team._id,
                  sku,
                  ...(amountMinor === undefined ? {} : { amountMinor }),
                  idempotencyKey: checkoutKey,
                  successUrl: `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}checkout=success`,
                  returnUrl,
                }),
              );
            }
          : undefined
      }
    />
  );
}
