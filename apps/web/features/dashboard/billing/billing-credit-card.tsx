import { Button } from "@baseblocks/ui/button";
import { Card, CardContent } from "@baseblocks/ui/card";
import { useTranslations } from "next-intl";

export type AiCreditTopUpOption = {
  sku: string;
  currency: string;
  minimumAmountMinor: bigint;
  quickAmountsMinor: bigint[];
};

export function BillingCreditCard({
  actionPending,
  balance,
  creditTopUp,
  isPlus,
  locale,
  onCreditCheckout,
}: {
  actionPending?: boolean;
  balance: string;
  creditTopUp: AiCreditTopUpOption;
  isPlus: boolean;
  locale: string;
  onCreditCheckout?: (sku: string, amountMinor?: bigint) => void;
}) {
  const t = useTranslations("billing");
  return (
    <section aria-labelledby="billing-ai-credits" className="space-y-3">
      <div>
        <h2 className="text-sm font-medium" id="billing-ai-credits">
          {t("credits.title")}
        </h2>
        {isPlus ? (
          <p className="text-sm text-muted-foreground">
            {t("credits.plusDescription")}
          </p>
        ) : null}
      </div>
      <Card className="gap-0 border-0 py-0 shadow-none">
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-4 p-4">
            <p className="text-sm font-medium">{t("credits.balance")}</p>
            <p className="text-sm font-medium tabular-nums">
              {t("current.aiBalance", { balance })}
            </p>
          </div>
          <div className="space-y-3 border-t border-foreground/[0.06] p-4">
            <p className="text-sm font-medium">{t("credits.quickAmounts")}</p>
            <div className="flex flex-wrap gap-2">
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
                    size="compact"
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
                size="compact"
                type="button"
                variant="outline"
              >
                {t("credits.customAmount")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
