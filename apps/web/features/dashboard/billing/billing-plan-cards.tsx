import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@baseblocks/ui/badge";
import { Button } from "@baseblocks/ui/button";
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
import { useTranslations } from "next-intl";

export type PlusBillingOption = {
  sku: string;
  recurringInterval: "month" | "year";
  priceAmountMinor: bigint;
  currency: string;
};

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

export function BillingPlanCards({
  actionPending,
  canManageBilling,
  isPlus,
  locale,
  onCheckout,
  onOpenPortal,
  onSelectPlusSku,
  plusOptions,
  selectedPlusOption,
}: {
  actionPending?: boolean;
  canManageBilling: boolean;
  isPlus: boolean;
  locale: string;
  onCheckout?: (sku: string) => void;
  onOpenPortal?: () => void;
  onSelectPlusSku: (sku: string) => void;
  plusOptions: PlusBillingOption[];
  selectedPlusOption?: PlusBillingOption;
}) {
  const t = useTranslations("billing");
  return (
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
            <PlanFeature>{t("plans.free.features.collaboration")}</PlanFeature>
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
          {!isPlus && plusOptions.length > 0 ? (
            <div className="mb-5 grid gap-2 sm:grid-cols-2">
              {plusOptions.map((option) => {
                const price = new Intl.NumberFormat(locale, {
                  style: "currency",
                  currency: option.currency.toUpperCase(),
                  maximumFractionDigits: 0,
                }).format(Number(option.priceAmountMinor) / 100);
                const selected = option.sku === selectedPlusOption?.sku;
                return (
                  <Button
                    aria-pressed={selected}
                    className="h-auto justify-start px-3 py-2.5 text-left"
                    key={option.sku}
                    onClick={() => onSelectPlusSku(option.sku)}
                    type="button"
                    variant={selected ? "secondary" : "outline"}
                  >
                    <span>
                      <span className="block font-medium">
                        {t(`plans.plus.intervals.${option.recurringInterval}`)}
                      </span>
                      <span className="block text-xs font-normal text-muted-foreground">
                        {t("plans.plus.pricePerMember", {
                          price,
                          interval: t(
                            `plans.plus.intervalUnits.${option.recurringInterval}`,
                          ),
                        })}
                      </span>
                    </span>
                  </Button>
                );
              })}
            </div>
          ) : null}
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
            ) : !isPlus && onCheckout && selectedPlusOption ? (
              <Button
                className="w-full"
                disabled={actionPending}
                onClick={() => onCheckout(selectedPlusOption.sku)}
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
  );
}
