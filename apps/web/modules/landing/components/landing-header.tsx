import { PublicHeader } from "@/modules/public-chrome/public-header";
import { Link } from "@/i18n/navigation";
import type { TranslateFn } from "@/modules/landing/types";
import { Button } from "@baseblocks/ui/button";

interface LandingHeaderProps {
  isAuthenticated: boolean;
  commonTranslations: TranslateFn;
  navigationTranslations: TranslateFn;
}

export function LandingHeader({
  isAuthenticated,
  commonTranslations,
  navigationTranslations,
}: LandingHeaderProps) {
  const authAction = isAuthenticated ? (
    <Link href="/dashboard">
      <Button size="sm">{navigationTranslations("dashboard")}</Button>
    </Link>
  ) : (
    <Link href="/login">
      <Button size="sm">{commonTranslations("signIn")}</Button>
    </Link>
  );

  return (
    <PublicHeader
      authAction={authAction}
      mobileChromeMode="overlay"
      docsLabel={navigationTranslations("docs")}
      legalLabel={navigationTranslations("legal")}
    />
  );
}
