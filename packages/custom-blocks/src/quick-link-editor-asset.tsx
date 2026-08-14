"use client";

import { Image01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { OpenEditorCustomBlockEditorHost } from "@openeditor/custom-block/editor";
import { useEffect, useRef, useState } from "react";
import { QuickLinkAssetLoader } from "./quick-link-asset-loader";

export function QuickLinkEditorAsset({
  assetId,
  host,
}: {
  assetId: string;
  host: OpenEditorCustomBlockEditorHost;
}) {
  const [asset, setAsset] = useState<{ src: string; alt: string } | null>(null);
  const loader = useRef(new QuickLinkAssetLoader());
  useEffect(() => {
    loader.current.load(assetId, host, setAsset);
    return () => loader.current.cancel();
  }, [assetId, host]);
  return asset ? (
    <img alt={asset.alt} className="size-full object-cover" src={asset.src} />
  ) : (
    <HugeiconsIcon aria-hidden icon={Image01Icon} />
  );
}
