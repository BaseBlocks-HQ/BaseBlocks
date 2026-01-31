"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function SiteNotPublished() {
  const t = useTranslations("errors");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">{t("siteNotPublished")}</h1>
        <p className="text-muted-foreground mb-8">
          {t("siteNotPublishedDescription")}
        </p>
        <Button asChild>
          <Link href="/">BaseBlocks</Link>
        </Button>
      </div>
    </div>
  );
}
