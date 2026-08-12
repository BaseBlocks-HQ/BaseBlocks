import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@baseblocks/ui/dialog";
import { cn } from "@baseblocks/ui/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import {
  BillingCreditCard,
  type AiCreditTopUpOption,
} from "@/features/dashboard/billing/billing-credit-card";
import {
  BillingPlanCards,
  type PlusBillingOption,
} from "@/features/dashboard/billing/billing-plan-cards";
import {
  DashboardPage,
  DashboardPageHeader,
} from "@/features/dashboard/layout/dashboard-page";
import {
  canUsePaidFeatures,
  getAdditionalSeatCount,
  getBillingCallout,
  type BillingCallout,
  type WorkspaceBillingEntitlement,
} from "./model";

export interface BillingOverviewProps {
  entitlement: WorkspaceBillingEntitlement;
  creditTopUp?: AiCreditTopUpOption;
  canManageBilling: boolean;
  plansHref: string;
  plusOptions: PlusBillingOption[];
  onCheckout?: (sku: string) => void;
  onCreditCheckout?: (sku: string, amountMinor?: bigint) => void;
  onOpenPortal?: () => void;
  actionPending?: boolean;
}

const calloutStyles: Record<BillingCallout, string> = {
  none: "",
  pending: "border-blue-500/25 bg-blue-500/8 text-blue-950 dark:text-blue-100",
  grace:
    "border-amber-500/25 bg-amber-500/10 text-amber-950 dark:text-amber-100",
  suspended: "border-destructive/25 bg-destructive/8 text-destructive",
  terminated: "border-border bg-muted/60 text-foreground",
  unknown: "border-border bg-muted/60 text-foreground",
};

function BillingStatusCallout({
  callout,
  onOpenPortal,
  canManageBilling,
  actionPending,
}: {
  callout: BillingCallout;
  onOpenPortal?: () => void;
  canManageBilling: boolean;
  actionPending?: boolean;
}) {
  const t = useTranslations("billing");

  if (callout === "none") return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center",
        calloutStyles[callout],
      )}
      role={callout === "pending" ? "status" : "alert"}
    >
      <HugeiconsIcon className="size-5 shrink-0" icon={Alert02Icon} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{t(`callouts.${callout}.title`)}</p>
        <p className="mt-0.5 text-sm opacity-75">
          {t(`callouts.${callout}.description`)}
        </p>
      </div>
      {canManageBilling && onOpenPortal ? (
        <Button
          disabled={actionPending}
          onClick={onOpenPortal}
          size="compact"
          type="button"
          variant="outline"
        >
          {t("actions.resolve")}
        </Button>
      ) : null}
    </div>
  );
}

function BillingSupportDialog() {
  const t = useTranslations("billing.support");

  return (
    <Dialog>
      <span>
        {t("prompt")}{" "}
        <DialogTrigger asChild>
          <button
            className="font-medium text-foreground underline decoration-foreground/30 underline-offset-2 transition-colors hover:decoration-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            type="button"
          >
            {t("contact")}
          </button>
        </DialogTrigger>
        .
      </span>
      <DialogContent className="overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[28rem] [&_[data-slot='dialog-close']]:top-4 [&_[data-slot='dialog-close']]:right-4">
        <DialogHeader className="px-5 pt-4 pb-0">
          <DialogTitle className="text-base font-semibold">
            {t("title")}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="px-5 pt-3 pb-5 text-left leading-relaxed text-sidebar-foreground/65">
          {t("description")}{" "}
          <a
            className="font-medium text-sidebar-foreground underline decoration-sidebar-foreground/30 underline-offset-2 transition-colors hover:decoration-sidebar-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            href="mailto:support@easylink.com"
          >
            support@easylink.com
          </a>
          .
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}

export function BillingOverview({
  entitlement,
  creditTopUp,
  canManageBilling,
  plansHref,
  plusOptions,
  onCheckout,
  onCreditCheckout,
  onOpenPortal,
  actionPending,
}: BillingOverviewProps) {
  const t = useTranslations("billing");
  const locale = useLocale();
  const isPlus = canUsePaidFeatures(entitlement);
  const additionalSeats = getAdditionalSeatCount(entitlement);
  const callout = getBillingCallout(entitlement);
  const [selectedPlusSku, setSelectedPlusSku] = useState(
    plusOptions.find((option) => option.recurringInterval === "year")?.sku ??
      plusOptions[0]?.sku,
  );
  const selectedPlusOption =
    plusOptions.find((option) => option.sku === selectedPlusSku) ??
    plusOptions[0];

  const effectiveThrough = entitlement.effectiveThrough
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
      }).format(entitlement.effectiveThrough)
    : null;
  const aiBalance = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(entitlement.availableAiCreditUnits) / 1_000_000);

  if (!canManageBilling) {
    return (
      <DashboardPage className="gap-8">
        <DashboardPageHeader title={t("title")} />

        <BillingStatusCallout callout={callout} canManageBilling={false} />

        <section aria-labelledby="billing-current-plan" className="space-y-3">
          <h2 className="text-sm font-medium" id="billing-current-plan">
            {t("current.title")}
          </h2>
          <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/[0.06]">
            <p className="text-sm font-medium">
              {isPlus ? t("plans.plus.name") : t("plans.free.name")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("current.memberCount", {
                count: entitlement.billableSeatCount,
              })}
              {isPlus
                ? ` · ${t("current.paidSeatCount", {
                    count: entitlement.paidSeatCapacity,
                  })}`
                : null}
            </p>
            {effectiveThrough ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("current.effectiveThrough", { date: effectiveThrough })}
              </p>
            ) : null}
          </div>
        </section>

        <section
          aria-labelledby="billing-member-access"
          className="flex gap-3 rounded-xl bg-muted/60 px-4 py-3"
        >
          <HugeiconsIcon
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            icon={InformationCircleIcon}
          />
          <div>
            <h2 className="text-sm font-medium" id="billing-member-access">
              {t("memberView.title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("memberView.description")}
            </p>
          </div>
        </section>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage className="gap-8">
      <DashboardPageHeader
        description={<BillingSupportDialog />}
        title={t("title")}
      />

      <BillingStatusCallout
        callout={callout}
        canManageBilling={canManageBilling}
        actionPending={actionPending}
        onOpenPortal={onOpenPortal}
      />

      <section aria-labelledby="billing-current-plan" className="space-y-3">
        <h2 className="text-sm font-medium" id="billing-current-plan">
          {t("current.title")}
        </h2>
        <div className="flex flex-col gap-4 rounded-xl bg-card p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {isPlus ? t("plans.plus.name") : t("plans.free.name")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("current.memberCount", {
                count: entitlement.billableSeatCount,
              })}
              {isPlus
                ? ` · ${t("current.paidSeatCount", {
                    count: entitlement.paidSeatCapacity,
                  })}`
                : null}
            </p>
            {additionalSeats > 0 || effectiveThrough ? (
              <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {additionalSeats > 0 ? (
                  <p>
                    {t("current.additionalSeats", { count: additionalSeats })}
                  </p>
                ) : null}
                {effectiveThrough ? (
                  <p>
                    {t("current.effectiveThrough", { date: effectiveThrough })}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          {isPlus && canManageBilling && onOpenPortal ? (
            <Button
              className="shrink-0"
              disabled={actionPending}
              onClick={onOpenPortal}
              size="compact"
              type="button"
              variant="outline"
            >
              {t("actions.manage")}
            </Button>
          ) : null}
        </div>
      </section>

      <BillingPlanCards
        actionPending={actionPending}
        canManageBilling={canManageBilling}
        isPlus={isPlus}
        locale={locale}
        onCheckout={onCheckout}
        onSelectPlusSku={setSelectedPlusSku}
        plansHref={plansHref}
        plusOptions={plusOptions}
        selectedPlusOption={selectedPlusOption}
      />

      {creditTopUp ? (
        <BillingCreditCard
          actionPending={actionPending}
          balance={aiBalance}
          creditTopUp={creditTopUp}
          isPlus={isPlus}
          locale={locale}
          onCreditCheckout={onCreditCheckout}
        />
      ) : null}
    </DashboardPage>
  );
}
