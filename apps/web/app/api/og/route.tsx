import { createBaseBlocksOpenGraphImage } from "@/modules/og/opengraph-image";
import type { NextRequest } from "next/server";

export function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name") ?? "BaseBlocks";

  return createBaseBlocksOpenGraphImage({ name });
}
