import { cn } from "@baseblocks/ui/lib/utils";
import type { ComponentProps } from "react";

export function SiteSettingsSectionTitle({
  className,
  ...props
}: ComponentProps<"h4">) {
  return <h4 className={cn("text-sm font-medium", className)} {...props} />;
}
