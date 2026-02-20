"use client";

import { EditorSkeleton } from "@/components/skeletons";
import dynamic from "next/dynamic";
import { use } from "react";

const SiteEditor = dynamic(
  () =>
    import("@/components/editor/site-editor").then((m) => ({
      default: m.SiteEditor,
    })),
  { loading: () => <EditorSkeleton />, ssr: false },
);

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
