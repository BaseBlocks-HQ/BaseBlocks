import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";

const port = 3002;
const origin = `http://localhost:${port}`;
const reportsDirectory = join(process.cwd(), ".artifacts", "seo");

if (process.env.NEXT_PUBLIC_SITE_URL !== origin) {
  throw new Error(`SEO audit requires NEXT_PUBLIC_SITE_URL=${origin}`);
}
if (process.env.NEXT_PUBLIC_ROOT_DOMAIN !== "localhost") {
  throw new Error("SEO audit requires NEXT_PUBLIC_ROOT_DOMAIN=localhost");
}
if (process.env.BASEBLOCKS_SEO_AUDIT !== "1") {
  throw new Error("SEO audit fixtures are not enabled");
}

await rm(reportsDirectory, { force: true, recursive: true });
await mkdir(reportsDirectory, { recursive: true });

const server = Bun.spawn(["bunx", "next", "start", "-p", String(port)], {
  cwd: join(process.cwd(), "apps", "web"),
  env: process.env,
  stderr: "inherit",
  stdout: "inherit",
});

try {
  await waitForServer();
  await validateMarketingSite();
  await validatePublishedSites();
  await runLighthouseAudits();
  process.stdout.write(
    "Technical SEO audit passed for BaseBlocks and customer sites.\n",
  );
} finally {
  server.kill();
  await server.exited;
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {}
    await Bun.sleep(250);
  }
  throw new Error("Next.js production server did not become ready");
}

async function validateMarketingSite() {
  const home = await getHtml("/");
  expectTag(home, "canonical", origin);
  expectAlternate(home, "en", origin);
  expectAlternate(home, "fr", `${origin}/fr`);
  expectAlternate(home, "x-default", origin);
  expectIncludes(home, '"@type":"SoftwareApplication"', "JSON-LD");
  expectIncludes(home, "Build sites your team will actually use", "server HTML");

  const french = await getHtml("/fr");
  expectTag(french, "canonical", `${origin}/fr`);
  expectAlternate(french, "en", origin);
  expectAlternate(french, "fr", `${origin}/fr`);

  const docs = await getHtml("/docs");
  expectTag(docs, "canonical", `${origin}/docs`);
  expectIncludes(docs, "What is BaseBlocks", "documentation HTML");

  const robots = await getText("/robots.txt");
  expectIncludes(robots, `Sitemap: ${origin}/sitemap.xml`, "root robots");
  expectIncludes(robots, "Disallow: /dashboard/", "private route rule");

  const sitemap = await getText("/sitemap.xml");
  for (const url of [origin, `${origin}/fr`, `${origin}/docs`]) {
    expectIncludes(sitemap, `<loc>${url}`, "marketing sitemap");
  }
  await validateSitemapPages(sitemap);
}

async function validatePublishedSites() {
  const subdomainOrigin = `http://acme.localhost:${port}`;
  const home = await getHtml("/handbook", subdomainOrigin);
  expectTag(home, "canonical", `${subdomainOrigin}/handbook`);
  expectMeta(home, "robots", "index, follow");
  expectIncludes(home, "Acme Knowledge Base | Acme Handbook", "tenant title");
  expectIncludes(
    home,
    "Acme publishes searchable team documentation with BaseBlocks.",
    "tenant server HTML",
  );

  const nested = await getHtml("/handbook/guides", subdomainOrigin);
  expectTag(nested, "canonical", `${subdomainOrigin}/handbook/guides`);
  expectIncludes(nested, "Getting Started | Acme Handbook", "nested title");

  const privatePage = await getHtml("/private", subdomainOrigin);
  expectMeta(privatePage, "robots", "noindex, nofollow");

  const missingPage = await getHtml("/handbook/missing", subdomainOrigin);
  expectMeta(missingPage, "robots", "noindex, nofollow");

  const tenantRobots = await getText("/robots.txt", subdomainOrigin);
  expectIncludes(
    tenantRobots,
    `Sitemap: ${subdomainOrigin}/sitemap.xml`,
    "tenant robots",
  );

  const tenantSitemap = await getText("/sitemap.xml", subdomainOrigin);
  expectIncludes(
    tenantSitemap,
    `<loc>${subdomainOrigin}/handbook</loc>`,
    "tenant sitemap home",
  );
  expectIncludes(
    tenantSitemap,
    `<loc>${subdomainOrigin}/handbook/guides</loc>`,
    "tenant sitemap nested page",
  );
  if (tenantSitemap.includes("/private")) {
    throw new Error("Private sites must not appear in tenant sitemaps");
  }
  await validateSitemapPages(tenantSitemap);

  const customOrigin = `http://docs.example.test:${port}`;
  const customHome = await getHtml("/", origin, {
    host: `docs.example.test:${port}`,
  });
  expectTag(customHome, "canonical", `${customOrigin}/`);
  expectIncludes(customHome, "Acme Knowledge Base | Acme Handbook", "custom-domain title");

  const customSitemap = await getText("/sitemap.xml", origin, {
    host: `docs.example.test:${port}`,
  });
  expectIncludes(
    customSitemap,
    `<loc>${customOrigin}/</loc>`,
    "custom-domain sitemap home",
  );
  expectIncludes(
    customSitemap,
    `<loc>${customOrigin}/guides</loc>`,
    "custom-domain sitemap nested page",
  );
}

async function validateSitemapPages(sitemap: string) {
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => match[1],
  );
  if (urls.length === 0) throw new Error("Sitemap did not contain any URLs");
  if (new Set(urls).size !== urls.length) {
    throw new Error("Sitemap contained duplicate URLs");
  }

  for (const url of urls) {
    if (!url) continue;
    const parsed = new URL(url);
    const html = await getHtml(`${parsed.pathname}${parsed.search}`, parsed.origin);
    expectTag(html, "canonical", url);
  }
}

async function runLighthouseAudits() {
  const surfaces = [
    { name: "marketing", url: `${origin}/` },
    { name: "docs", url: `${origin}/docs` },
    { name: "tenant-subdomain", url: `http://acme.localhost:${port}/handbook` },
    {
      name: "tenant-custom-domain",
      url: `http://docs.example.test:${port}/`,
      chromeFlags:
        '--headless --no-sandbox --host-resolver-rules="MAP docs.example.test 127.0.0.1"',
    },
  ];

  for (const surface of surfaces) {
    const outputPath = join(reportsDirectory, `${surface.name}.json`);
    const process = Bun.spawn(
      [
        "bunx",
        "lighthouse",
        surface.url,
        "--quiet",
        "--only-categories=seo",
        "--output=json",
        `--output-path=${outputPath}`,
        `--chrome-flags=${surface.chromeFlags ?? "--headless --no-sandbox"}`,
      ],
      { stderr: "inherit", stdout: "inherit" },
    );
    const exitCode = await process.exited;
    if (exitCode !== 0) {
      throw new Error(`Lighthouse failed for ${surface.name}`);
    }

    const report = JSON.parse(await readFile(outputPath, "utf8"));
    const score = report.categories?.seo?.score;
    if (score !== 1) {
      const failures = report.categories.seo.auditRefs
        .filter(
          (reference: { id: string; weight: number }) =>
            reference.weight > 0 && report.audits[reference.id]?.score === 0,
        )
        .map((reference: { id: string }) => reference.id)
        .join(", ");
      throw new Error(
        `${surface.name} SEO score was ${Math.round((score ?? 0) * 100)}; failed: ${failures}`,
      );
    }
  }
}

async function getHtml(
  pathname: string,
  requestOrigin = origin,
  headers?: Record<string, string>,
) {
  const response = await fetch(`${requestOrigin}${pathname}`, { headers });
  if (!response.ok) {
    throw new Error(`${requestOrigin}${pathname} returned ${response.status}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    throw new Error(`${requestOrigin}${pathname} did not return HTML`);
  }
  return response.text();
}

async function getText(
  pathname: string,
  requestOrigin = origin,
  headers?: Record<string, string>,
) {
  const response = await fetch(`${requestOrigin}${pathname}`, { headers });
  if (!response.ok) {
    throw new Error(`${requestOrigin}${pathname} returned ${response.status}`);
  }
  return response.text();
}

function expectTag(html: string, rel: string, expectedHref: string) {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  const found = tags.some(
    (tag) =>
      readAttribute(tag, "rel") === rel &&
      normalizeUrl(readAttribute(tag, "href")) === normalizeUrl(expectedHref),
  );
  if (!found) throw new Error(`Missing ${rel} URL ${expectedHref}`);
}

function expectAlternate(html: string, language: string, expectedHref: string) {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  const found = tags.some(
    (tag) =>
      readAttribute(tag, "rel") === "alternate" &&
      readAttribute(tag, "hreflang")?.toLowerCase() === language &&
      normalizeUrl(readAttribute(tag, "href")) === normalizeUrl(expectedHref),
  );
  if (!found) {
    throw new Error(`Missing ${language} alternate URL ${expectedHref}`);
  }
}

function expectMeta(html: string, name: string, expectedContent: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const found = tags.some(
    (tag) =>
      readAttribute(tag, "name")?.toLowerCase() === name &&
      readAttribute(tag, "content")?.toLowerCase() ===
        expectedContent.toLowerCase(),
  );
  if (!found) throw new Error(`Missing ${name}=${expectedContent}`);
}

function readAttribute(tag: string, attribute: string) {
  const match = tag.match(
    new RegExp(`${attribute}=["']([^"']*)["']`, "i"),
  );
  return match?.[1];
}

function normalizeUrl(value: string | undefined) {
  if (!value) return null;
  const url = new URL(value);
  return `${url.origin}${url.pathname === "/" ? "" : url.pathname}`;
}

function expectIncludes(value: string, expected: string, label: string) {
  if (!value.includes(expected)) {
    throw new Error(`${label} did not include ${expected}`);
  }
}
