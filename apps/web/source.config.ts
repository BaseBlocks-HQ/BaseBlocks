import { defineConfig, defineDocs } from "fumadocs-mdx/config";

export const docs = defineDocs({
  dir: "modules/marketing/content/docs",
});

export const legalEn = defineDocs({
  dir: "modules/marketing/content/legal/en",
});

export const legalFr = defineDocs({
  dir: "modules/marketing/content/legal/fr",
});

export default defineConfig();
