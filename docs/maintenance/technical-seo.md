# Technical SEO contract

BaseBlocks treats technical SEO as a release requirement for both the product
site and sites published by customers.

Run the same gate as CI with:

```sh
bun run seo:audit
```

The command builds the production Next.js application with an isolated audit
origin, starts it locally, and validates:

- every marketing, documentation, and legal URL emitted by the sitemap;
- localized canonical and `hreflang` annotations;
- marketing JSON-LD and server-rendered content;
- root and customer-host robots and sitemap behavior;
- customer subdomain and custom-domain canonical URLs;
- nested customer page URLs and server-rendered page content;
- `index, follow` for public customer pages;
- `noindex, nofollow` for private and missing customer pages;
- exclusion of private sites from public sitemaps; and
- a Lighthouse SEO score of 100 for marketing, docs, a customer subdomain,
  and a customer custom domain.

Audit customer data is available only when `BASEBLOCKS_SEO_AUDIT=1` and never
when `VERCEL=1`. It does not query or mutate Convex.

`NEXT_PUBLIC_SITE_URL` is the canonical marketing origin, including protocol.
Production must use `https://baseblocks.dev`. The audit command supplies its own
local origin so canonical URLs remain self-referential during Lighthouse runs.

This gate proves the rendered technical contract. It cannot guarantee rankings,
Google indexing decisions, production DNS/TLS behavior, or field Core Web
Vitals. After deployment, smoke-test the production domain and monitor Google
Search Console for indexing and real-user data.
