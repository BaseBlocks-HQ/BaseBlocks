"use client";

import { EditorSkeleton } from "@/components/skeletons";
import dynamic from "next/dynamic";
import { use } from "react";

const SiteEditor = dynamic(
  () =>
    import("@/modules/editor/site-editor").then((m) => ({
      default: m.SiteEditor,
    })),
  { loading: () => <EditorSkeleton />, ssr: false },
);

type Props = {
  params: Promise<{ siteId: string }>;
};

export default function TeamSiteEditorPage({ params }: Props) {
  const { siteId } = use(params);
  return <SiteEditor siteId={siteId} />;
}
