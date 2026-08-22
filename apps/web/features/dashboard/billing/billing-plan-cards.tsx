import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@baseblocks/ui/button";
import { Switch } from "@baseblocks/ui/switch";
import Link from "next/link";
import { useTranslations } from "next-intl";

export type PlusBillingOption = {
  sku: string;
  recurringInterval: "month" | "year";
  priceAmountMinor: bigint;
  currency: string;
};

export function BillingIntervalSwitch({
  disabled,
  id,
  onSelect,
  options,
  selectedOption,
}: {
  disabled?: boolean;
  id: string;
  onSelect: (sku: string) => void;
  options: PlusBillingOption[];
  selectedOption?: PlusBillingOption;
}) {
  const t = useTranslations("billing");
  const monthlyOption = options.find(
    (option) => option.recurringInterval === "month",
  );
  const yearlyOption = options.find(
    (option) => option.recurringInterval === "year",
  );
  const isYearly = selectedOption?.recurringInterval === "year";

  if (!monthlyOption || !yearlyOption) return null;

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={isYearly}
        disabled={disabled}
        id={id}
        onCheckedChange={(checked) =>
          onSelect(checked ? yearlyOption.sku : monthlyOption.sku)
        }
        size="sm"
      />
      <label
        className="cursor-pointer text-xs font-normal text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
        htmlFor={id}
      >
        {t(isYearly ? "plans.plus.billedYearly" : "plans.plus.billedMonthly")}
      </label>
    </div>
  );
}

function PlanFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-xs text-muted-foreground">
      <HugeiconsIcon
        aria-hidden="true"
        className="mt-px size-4 shrink-0 text-foreground"
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
  onSelectPlusSku,
  plansHref,
  plusOptions,
  selectedPlusOption,
}: {
  actionPending?: boolean;
  canManageBilling: boolean;
  isPlus: boolean;
  locale: string;
  onCheckout?: (sku: string) => void;
  onSelectPlusSku: (sku: string) => void;
  plansHref: string;
  plusOptions: PlusBillingOption[];
  selectedPlusOption?: PlusBillingOption;
}) {
  const t = useTranslations("billing");
  const selectedPrice = selectedPlusOption
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: selectedPlusOption.currency.toUpperCase(),
        maximumFractionDigits: 0,
      }).format(Number(selectedPlusOption.priceAmountMinor) / 100)
    : null;

  return (
    <section aria-labelledby="billing-plans" className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium" id="billing-plans">
          {t("plans.title")}
        </h2>
        <Button asChild size="compact" variant="ghost">
          <Link href={plansHref}>{t("plans.all")}</Link>
        </Button>
      </div>

      {!isPlus ? (
        <div className="rounded-xl bg-card p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium">{t("plans.upgradeTitle")}</p>
              {selectedPlusOption && selectedPrice ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("plans.plus.pricePerMember", {
                    price: selectedPrice,
                    interval: t(
                      `plans.plus.intervalUnits.${selectedPlusOption.recurringInterval}`,
                    ),
                  })}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <BillingIntervalSwitch
                disabled={actionPending}
                id="billing-upgrade-yearly"
                onSelect={onSelectPlusSku}
                options={plusOptions}
                selectedOption={selectedPlusOption}
              />
              {canManageBilling ? (
                onCheckout && selectedPlusOption ? (
                  <Button
                    disabled={actionPending}
                    onClick={() => onCheckout(selectedPlusOption.sku)}
                    size="compact"
                    type="button"
                  >
                    {t("actions.upgrade")}
                  </Button>
                ) : (
                  <Button disabled size="compact" variant="outline">
                    {t("actions.unavailable")}
                  </Button>
                )
              ) : (
                <p className="max-w-72 text-xs text-muted-foreground">
                  {t("adminRequired")}
                </p>
              )}
            </div>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            <PlanFeature>{t("plans.plus.features.everything")}</PlanFeature>
            <PlanFeature>{t("plans.plus.features.ai")}</PlanFeature>
          </ul>
        </div>
      ) : null}
    </section>
  );
}
