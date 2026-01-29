"use client";

import { SiteEditor } from "@/components/editor";
import { use } from "react";

type Props = {
  params: Promise<{ siteId: string }>;
};

/**
 * Site editor page - edit pages and blocks for a site
 * All logic is encapsulated in SiteEditor component
 */
export default function SiteEditorPage({ params }: Props) {
  const { siteId } = use(params);
  return <SiteEditor siteId={siteId} />;
}
