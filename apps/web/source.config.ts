import { defineConfig, defineDocs } from "fumadocs-mdx/config";

export const docs = defineDocs({
  dir: "modules/content-pages/content/docs",
});

export const legalEn = defineDocs({
  dir: "modules/content-pages/content/legal/en",
});

export const legalFr = defineDocs({
  dir: "modules/content-pages/content/legal/fr",
});

export default defineConfig();
