import { cn } from "@/lib/utils";
import Image from "next/image";

interface BrandLogoMarkProps {
  className?: string;
  priority?: boolean;
  sizes?: string;
}

export function BrandLogoMark({
  className,
  priority = false,
  sizes = "32px",
}: BrandLogoMarkProps) {
  return (
    <Image
      src="/brand/baseblocks-logo.png"
      alt=""
      width={600}
      height={600}
      priority={priority}
      sizes={sizes}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
