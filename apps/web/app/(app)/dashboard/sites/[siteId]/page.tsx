"use client";

import { use } from "react";
import { SiteEditor } from "@/components/editor";

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
