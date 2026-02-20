"use client";

import { Link } from "@/i18n/navigation";
import { getDisplayDomain } from "@/lib/utils";
import { Button } from "@repo/ui/button";
import { useTranslations } from "next-intl";

interface SiteNotFoundProps {
  subdomain: string;
}

export function SiteNotFound({ subdomain }: SiteNotFoundProps) {
  const t = useTranslations("errors");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">{t("siteNotFound")}</h1>
        <p className="text-muted-foreground mb-8">
          {t("siteNotFoundDescription")}{" "}
          <strong>{getDisplayDomain(subdomain)}</strong>
        </p>
        <Button asChild>
          <Link href="/">BaseBlocks</Link>
        </Button>
      </div>
    </div>
  );
}
