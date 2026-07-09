import {
  type DocsCollection,
  defineConfig,
  defineDocs,
} from "fumadocs-mdx/config";
import type { metaSchema, pageSchema } from "fumadocs-core/source/schema";

type DefaultDocsCollection = DocsCollection<
  typeof pageSchema,
  typeof metaSchema
>;

export const docs: DefaultDocsCollection = defineDocs({
  dir: "modules/content-pages/content/docs",
});

export const legalEn: DefaultDocsCollection = defineDocs({
  dir: "modules/content-pages/content/legal/en",
});

export const legalFr: DefaultDocsCollection = defineDocs({
  dir: "modules/content-pages/content/legal/fr",
});

export default defineConfig();
