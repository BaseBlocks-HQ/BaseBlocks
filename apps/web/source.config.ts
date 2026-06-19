import { defineConfig, defineDocs } from "fumadocs-mdx/config";

export const docs = defineDocs({
  dir: "content/docs",
});

export const legalEn = defineDocs({
  dir: "content/legal/en",
});

export const legalFr = defineDocs({
  dir: "content/legal/fr",
});

export default defineConfig();
