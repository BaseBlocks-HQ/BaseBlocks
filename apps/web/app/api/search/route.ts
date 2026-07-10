import { source } from "@/features/marketing/content-pages/source";
import { createFromSource } from "fumadocs-core/search/server";

export const revalidate = false;
export const { GET } = createFromSource(source);
