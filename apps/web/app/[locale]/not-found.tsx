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
      <a
        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        href="/"
      >
        {tCommon("back")}
      </a>
    </div>
  );
}
