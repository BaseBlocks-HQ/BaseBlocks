import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  CreditCardIcon,
  SparklesIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@baseblocks/ui/badge";
import { Button } from "@baseblocks/ui/button";
import { Label } from "@baseblocks/ui/label";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@baseblocks/ui/card";
import { cn } from "@baseblocks/ui/lib/utils";
import { useLocale, useTranslations } from "next-intl";
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
  creditTopUp?: {
    sku: string;
    currency: string;
    minimumAmountMinor: bigint;
    quickAmountsMinor: bigint[];
  };
  canManageBilling: boolean;
  onCheckout?: () => void;
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
          size="sm"
          type="button"
          variant="outline"
        >
          {t("actions.resolve")}
        </Button>
      ) : null}
    </div>
  );
}

function PlanFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-sm text-muted-foreground">
      <HugeiconsIcon
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-foreground"
        icon={CheckmarkCircle02Icon}
      />
      <span>{children}</span>
    </li>
  );
}

export function BillingOverview({
  entitlement,
  creditTopUp,
  canManageBilling,
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
  return (
    <DashboardPage className="gap-5">
      <DashboardPageHeader title={t("title")} />

      <BillingStatusCallout
        callout={callout}
        canManageBilling={canManageBilling}
        actionPending={actionPending}
        onOpenPortal={onOpenPortal}
      />

      <section aria-labelledby="billing-current-plan">
        <Card className="gap-5 border-foreground/[0.07] shadow-none">
          <CardHeader>
            <CardTitle id="billing-current-plan">
              {t("current.title")}
            </CardTitle>
            <CardDescription>
              {isPlus
                ? t("current.plusDescription")
                : t("current.freeDescription")}
            </CardDescription>
            <CardAction>
              <Badge variant={isPlus ? "default" : "secondary"}>
                {isPlus ? t("plans.plus.name") : t("plans.free.name")}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-muted/50 p-3">
              <HugeiconsIcon
                aria-hidden="true"
                className="mb-2 size-5 text-muted-foreground"
                icon={UserGroupIcon}
              />
              <p className="text-sm text-muted-foreground">
                {t("current.members")}
              </p>
              <p className="mt-0.5 font-medium tabular-nums">
                {entitlement.billableSeatCount}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <HugeiconsIcon
                aria-hidden="true"
                className="mb-2 size-5 text-muted-foreground"
                icon={CreditCardIcon}
              />
              <p className="text-sm text-muted-foreground">
                {t("current.paidSeats")}
              </p>
              <p className="mt-0.5 font-medium tabular-nums">
                {entitlement.paidSeatCapacity}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <HugeiconsIcon
                aria-hidden="true"
                className="mb-2 size-5 text-muted-foreground"
                icon={SparklesIcon}
              />
              <p className="text-sm text-muted-foreground">{t("current.ai")}</p>
              <p className="mt-0.5 font-medium">
                {t("current.aiBalance", { balance: aiBalance })}
              </p>
            </div>
          </CardContent>
          {additionalSeats > 0 || effectiveThrough ? (
            <CardFooter className="flex-col items-start gap-1 text-sm text-muted-foreground">
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
            </CardFooter>
          ) : null}
        </Card>
      </section>

      <section
        aria-labelledby="billing-plans"
        className="grid gap-4 md:grid-cols-2"
      >
        <h2 className="sr-only" id="billing-plans">
          {t("plans.title")}
        </h2>
        <Card
          className={cn(
            "gap-5 shadow-none",
            !isPlus ? "border-foreground/20" : "border-foreground/[0.07]",
          )}
        >
          <CardHeader>
            <CardTitle>{t("plans.free.name")}</CardTitle>
            <CardDescription>{t("plans.free.description")}</CardDescription>
            {!isPlus ? (
              <CardAction>
                <Badge variant="outline">{t("plans.current")}</Badge>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <PlanFeature>{t("plans.free.features.sites")}</PlanFeature>
              <PlanFeature>{t("plans.free.features.publishing")}</PlanFeature>
              <PlanFeature>
                {t("plans.free.features.collaboration")}
              </PlanFeature>
              <PlanFeature>{t("plans.free.features.ai")}</PlanFeature>
            </ul>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "gap-5 shadow-none",
            isPlus ? "border-primary/40" : "border-foreground/[0.07]",
          )}
        >
          <CardHeader>
            <CardTitle>{t("plans.plus.name")}</CardTitle>
            <CardDescription>{t("plans.plus.description")}</CardDescription>
            {isPlus ? (
              <CardAction>
                <Badge>{t("plans.current")}</Badge>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <PlanFeature>{t("plans.plus.features.everything")}</PlanFeature>
              <PlanFeature>{t("plans.plus.features.ai")}</PlanFeature>
              <PlanFeature>{t("plans.plus.features.seats")}</PlanFeature>
            </ul>
          </CardContent>
          {canManageBilling ? (
            <CardFooter>
              {isPlus && onOpenPortal ? (
                <Button
                  className="w-full"
                  disabled={actionPending}
                  onClick={onOpenPortal}
                  type="button"
                  variant="outline"
                >
                  {t("actions.manage")}
                </Button>
              ) : !isPlus && onCheckout ? (
                <Button
                  className="w-full"
                  disabled={actionPending}
                  onClick={onCheckout}
                  type="button"
                >
                  {t("actions.upgrade")}
                </Button>
              ) : (
                <Button className="w-full" disabled variant="outline">
                  {t("actions.unavailable")}
                </Button>
              )}
            </CardFooter>
          ) : (
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                {t("adminRequired")}
              </p>
            </CardFooter>
          )}
        </Card>
      </section>

      {creditTopUp ? (
        <section aria-labelledby="billing-ai-credits" className="space-y-3">
          <div>
            <h2 className="font-semibold" id="billing-ai-credits">
              {t("credits.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t(
                isPlus ? "credits.plusDescription" : "credits.freeDescription",
              )}
            </p>
          </div>
          <Card className="gap-5 shadow-none">
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>{t("credits.quickAmounts")}</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {creditTopUp.quickAmountsMinor.map((amountMinor) => {
                    const amount = new Intl.NumberFormat(locale, {
                      style: "currency",
                      currency: creditTopUp.currency.toUpperCase(),
                      maximumFractionDigits: 0,
                    }).format(Number(amountMinor) / 100);
                    return (
                      <Button
                        disabled={actionPending || !onCreditCheckout}
                        key={String(amountMinor)}
                        onClick={() =>
                          onCreditCheckout?.(creditTopUp.sku, amountMinor)
                        }
                        type="button"
                        variant="outline"
                      >
                        {amount}
                      </Button>
                    );
                  })}
                  <Button
                    disabled={actionPending || !onCreditCheckout}
                    onClick={() => onCreditCheckout?.(creditTopUp.sku)}
                    type="button"
                    variant="outline"
                  >
                    {t("credits.customAmount")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("credits.customMinimum", {
                    minimum: Number(creditTopUp.minimumAmountMinor) / 100,
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </DashboardPage>
  );
}
