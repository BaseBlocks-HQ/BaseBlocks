import { ArrowLeft01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@baseblocks/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@baseblocks/ui/table";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Fragment, useState } from "react";
import {
  DashboardPage,
  DashboardPageHeader,
} from "@/features/dashboard/layout/dashboard-page";
import {
  BillingIntervalSwitch,
  type PlusBillingOption,
} from "./billing-plan-cards";
import { canUsePaidFeatures, type WorkspaceBillingEntitlement } from "./model";

function Included() {
  const t = useTranslations("billing.plans.comparison");

  return (
    <span className="inline-flex items-center gap-2 text-foreground">
      <HugeiconsIcon aria-hidden icon={Tick01Icon} className="size-4" />
      <span>{t("included")}</span>
    </span>
  );
}

export function BillingPlansPage({
  actionPending,
  billingHref,
  canManageBilling,
  entitlement,
  onCheckout,
  onOpenPortal,
  plusOptions,
}: {
  actionPending?: boolean;
  billingHref: string;
  canManageBilling: boolean;
  entitlement: WorkspaceBillingEntitlement;
  onCheckout?: (sku: string) => void;
  onOpenPortal?: () => void;
  plusOptions: PlusBillingOption[];
}) {
  const t = useTranslations("billing");
  const locale = useLocale();
  const isPlus = canUsePaidFeatures(entitlement);
  const [selectedPlusSku, setSelectedPlusSku] = useState(
    plusOptions.find((option) => option.recurringInterval === "year")?.sku ??
      plusOptions[0]?.sku,
  );
  const selectedPlusOption =
    plusOptions.find((option) => option.sku === selectedPlusSku) ??
    plusOptions[0];
  const selectedPrice = selectedPlusOption
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: selectedPlusOption.currency.toUpperCase(),
        maximumFractionDigits: 0,
      }).format(Number(selectedPlusOption.priceAmountMinor) / 100)
    : null;

  const featureGroups = [
    {
      title: t("plans.comparison.usage"),
      rows: [
        {
          feature: t("plans.comparison.members"),
          free: t("plans.comparison.unlimited"),
          plus: t("plans.comparison.unlimited"),
        },
        {
          feature: t("plans.comparison.ai"),
          free: t("plans.comparison.prepaid"),
          plus: t("plans.comparison.includedAndPrepaid"),
        },
      ],
    },
    {
      title: t("plans.comparison.core"),
      rows: [
        {
          feature: t("plans.comparison.sites"),
          free: <Included />,
          plus: <Included />,
        },
        {
          feature: t("plans.comparison.publishing"),
          free: <Included />,
          plus: <Included />,
        },
        {
          feature: t("plans.comparison.collaboration"),
          free: <Included />,
          plus: <Included />,
        },
      ],
    },
  ];

  return (
    <DashboardPage className="gap-0">
      <DashboardPageHeader
        description={t("plans.currentSummary", {
          plan: isPlus ? t("plans.plus.name") : t("plans.free.name"),
        })}
        leading={
          <Button
            asChild
            className="size-7 shrink-0 rounded-lg"
            size="icon-sm"
            variant="ghost"
          >
            <Link
              aria-label={t("actions.backToBilling")}
              href={billingHref}
              title={t("actions.backToBilling")}
            >
              <HugeiconsIcon aria-hidden icon={ArrowLeft01Icon} />
            </Link>
          </Button>
        }
        title={t("plans.title")}
      />

      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
        <Table className="min-w-[48rem] table-fixed">
          <TableHeader className="[&_tr]:border-foreground/[0.06]">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-auto w-[40%] p-0 align-top" />
              <TableHead className="h-auto w-[30%] p-0 align-top font-normal">
                <div className="space-y-4 px-6 py-6">
                  <div>
                    <p className="text-lg font-medium text-foreground">
                      {t("plans.free.name")}
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      <span className="font-semibold">
                        {t("plans.free.price")}
                      </span>
                    </p>
                  </div>
                  {isPlus && canManageBilling && onOpenPortal ? (
                    <Button
                      className="w-full"
                      disabled={actionPending}
                      onClick={onOpenPortal}
                      size="compact"
                      type="button"
                      variant="outline"
                    >
                      {t("actions.change")}
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      disabled
                      size="compact"
                      variant="outline"
                    >
                      {t("plans.current")}
                    </Button>
                  )}
                </div>
              </TableHead>
              <TableHead className="h-auto w-[30%] bg-card p-0 align-top font-normal">
                <div className="space-y-4 px-6 py-6">
                  <div>
                    <p className="text-lg font-medium text-foreground">
                      {t("plans.plus.name")}
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      <span className="font-semibold">
                        {selectedPrice ?? t("actions.unavailable")}
                      </span>{" "}
                      {selectedPrice ? (
                        <span className="text-xs text-muted-foreground">
                          {t("plans.perMember", {
                            interval: t(
                              `plans.plus.intervalUnits.${selectedPlusOption?.recurringInterval ?? "month"}`,
                            ),
                          })}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <BillingIntervalSwitch
                    disabled={actionPending}
                    id="billing-plans-yearly"
                    onSelect={setSelectedPlusSku}
                    options={plusOptions}
                    selectedOption={selectedPlusOption}
                  />
                  {isPlus ? (
                    <Button
                      className="w-full"
                      disabled
                      size="compact"
                      variant="secondary"
                    >
                      {t("plans.current")}
                    </Button>
                  ) : canManageBilling && onCheckout && selectedPlusOption ? (
                    <Button
                      className="w-full"
                      disabled={actionPending}
                      onClick={() => onCheckout(selectedPlusOption.sku)}
                      size="compact"
                      type="button"
                    >
                      {t("actions.upgrade")}
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      disabled
                      size="compact"
                      variant="outline"
                    >
                      {t("actions.unavailable")}
                    </Button>
                  )}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {featureGroups.map((group) => (
              <Fragment key={group.title}>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell className="px-0 pt-8 pb-3 text-sm font-medium">
                    {group.title}
                  </TableCell>
                  <TableCell />
                  <TableCell className="bg-card" />
                </TableRow>
                {group.rows.map((row) => (
                  <TableRow
                    className="border-foreground/[0.06] hover:bg-muted/20"
                    key={row.feature}
                  >
                    <TableCell className="py-3 pr-4 pl-0 font-normal whitespace-normal text-muted-foreground">
                      {row.feature}
                    </TableCell>
                    <TableCell className="px-6 py-3 text-muted-foreground">
                      {row.free}
                    </TableCell>
                    <TableCell className="bg-card px-6 py-3 text-muted-foreground">
                      {row.plus}
                    </TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardPage>
  );
}
