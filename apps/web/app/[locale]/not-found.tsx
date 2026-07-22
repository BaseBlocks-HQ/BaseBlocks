import { Button } from "@baseblocks/ui/button";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const [t, tCommon] = await Promise.all([
    getTranslations("errors"),
    getTranslations("common"),
  ]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">{t("notFound")}</h1>
      <p className="text-muted-foreground">{t("notFoundDescription")}</p>
      <Button asChild>
        <Link href="/">{tCommon("back")}</Link>
      </Button>
    </div>
  );
}
