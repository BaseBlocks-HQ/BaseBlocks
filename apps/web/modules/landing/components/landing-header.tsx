import { PublicHeader } from "@/modules/public-site/chrome/public-header";
import { Link } from "@/i18n/navigation";
import { Button } from "@baseblocks/ui/button";

type TranslateFn = (key: string) => string;

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
