import { Button } from "@baseblocks/ui/button";
import { Card, CardContent } from "@baseblocks/ui/card";
import { Label } from "@baseblocks/ui/label";
import { useTranslations } from "next-intl";

export type AiCreditTopUpOption = {
  sku: string;
  currency: string;
  minimumAmountMinor: bigint;
  quickAmountsMinor: bigint[];
};

export function BillingCreditCard({
  actionPending,
  creditTopUp,
  isPlus,
  locale,
  onCreditCheckout,
}: {
  actionPending?: boolean;
  creditTopUp: AiCreditTopUpOption;
  isPlus: boolean;
  locale: string;
  onCreditCheckout?: (sku: string, amountMinor?: bigint) => void;
}) {
  const t = useTranslations("billing");
  return (
    <section aria-labelledby="billing-ai-credits" className="space-y-3">
      <div>
        <h2 className="font-semibold" id="billing-ai-credits">
          {t("credits.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t(isPlus ? "credits.plusDescription" : "credits.freeDescription")}
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
  );
}
