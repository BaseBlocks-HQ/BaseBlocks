import "server-only";

import { getRootDomain } from "@/lib/routing/hosts";
import { createMockAnalyticsSnapshot } from "./analytics-mock";
import type {
  AnalyticsRankedValue,
  AnalyticsSnapshot,
  SiteAnalyticsResponse,
} from "./analytics-types";

interface SiteAnalyticsScope {
  organizationSlug: string;
  pagePaths: string[][];
  site: {
    _id: string;
    name: string;
    slug: string;
  };
  verifiedDomains: string[];
}

interface AnalyticsSource {
  hostname: string[];
  paths: string[];
  sitePrefix?: string;
}

interface VercelOverview {
  bounceRate?: number;
  devices: number;
  total: number;
}

interface VercelRealtime {
  devices: number;
}

interface VercelStats {
  data: Array<{ devices: number; key: string; total: number }>;
}

interface VercelTimeseries {
  data: {
    groups: {
      all: Array<{ devices: number; key: string; total: number }>;
    };
  };
}

interface SourceResult {
  countries: AnalyticsRankedValue[];
  devices: AnalyticsRankedValue[];
  online: number;
  operatingSystems: AnalyticsRankedValue[];
  overview: VercelOverview;
  pages: AnalyticsRankedValue[];
  previousOverview: VercelOverview;
  referrers: AnalyticsRankedValue[];
  timeseries: AnalyticsSnapshot["timeseries"];
}

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const MAX_FILTER_PATHS = 100;

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

function rankedValues(stats: VercelStats, mapKey?: (key: string) => string) {
  return stats.data.map(
    (item): AnalyticsRankedValue => ({
      key: mapKey?.(item.key) ?? item.key,
      pageViews: item.total,
      visitors: item.devices,
    }),
  );
}

function buildUrl(
  resource: "overview" | "realtime" | "stats" | "timeseries",
  options: {
    filter: string;
    from?: Date;
    projectId: string;
    teamId: string;
    to?: Date;
    type?: string;
    withBounceRate?: boolean;
  },
) {
  const params = new URLSearchParams({
    environment: "production",
    filter: options.filter,
    projectId: options.projectId,
    teamId: options.teamId,
    tz: "Europe/Paris",
  });

  if (options.from) params.set("from", options.from.toISOString());
  if (options.to) params.set("to", options.to.toISOString());
  if (options.type) {
    params.set("limit", "250");
    params.set("type", options.type);
  }
  if (options.withBounceRate) params.set("withBounceRate", "true");

  return `https://vercel.com/api/web-analytics/v2/${resource}?${params}`;
}

async function getJson<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Vercel analytics request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function sourceFilter(source: AnalyticsSource) {
  return JSON.stringify({
    hostname: { operator: "eq", values: source.hostname },
    path: { operator: "eq", values: source.paths },
  });
}

function displayPath(path: string, sitePrefix?: string) {
  if (!sitePrefix) return path || "/";
  if (path === sitePrefix) return "/";
  return path.startsWith(`${sitePrefix}/`)
    ? path.slice(sitePrefix.length)
    : path;
}

function label(value: string) {
  if (!value) return "Direct";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function fetchSource({
  accessToken,
  from,
  previousFrom,
  projectId,
  source,
  teamId,
  to,
}: {
  accessToken: string;
  from: Date;
  previousFrom: Date;
  projectId: string;
  source: AnalyticsSource;
  teamId: string;
  to: Date;
}): Promise<SourceResult> {
  const shared = {
    filter: sourceFilter(source),
    projectId,
    teamId,
  };
  const [
    overview,
    previousOverview,
    realtime,
    timeseries,
    pages,
    countries,
    devices,
    referrers,
    operatingSystems,
  ] = await Promise.all([
    getJson<VercelOverview>(
      buildUrl("overview", { ...shared, from, to, withBounceRate: true }),
      accessToken,
    ),
    getJson<VercelOverview>(
      buildUrl("overview", {
        ...shared,
        from: previousFrom,
        to: from,
        withBounceRate: true,
      }),
      accessToken,
    ),
    getJson<VercelRealtime>(buildUrl("realtime", shared), accessToken),
    getJson<VercelTimeseries>(
      buildUrl("timeseries", { ...shared, from, to }),
      accessToken,
    ),
    getJson<VercelStats>(
      buildUrl("stats", { ...shared, from, to, type: "path" }),
      accessToken,
    ),
    getJson<VercelStats>(
      buildUrl("stats", { ...shared, from, to, type: "country" }),
      accessToken,
    ),
    getJson<VercelStats>(
      buildUrl("stats", { ...shared, from, to, type: "device_type" }),
      accessToken,
    ),
    getJson<VercelStats>(
      buildUrl("stats", { ...shared, from, to, type: "referrer" }),
      accessToken,
    ),
    getJson<VercelStats>(
      buildUrl("stats", { ...shared, from, to, type: "os_name" }),
      accessToken,
    ),
  ]);

  return {
    countries: rankedValues(
      countries,
      (country) => countryNames.of(country) ?? country,
    ),
    devices: rankedValues(devices, label),
    online: realtime.devices,
    operatingSystems: rankedValues(operatingSystems, label),
    overview,
    pages: rankedValues(pages, (path) => displayPath(path, source.sitePrefix)),
    previousOverview,
    referrers: rankedValues(referrers, (referrer) => referrer || "Direct"),
    timeseries: timeseries.data.groups.all.map((point) => ({
      date: point.key,
      pageViews: point.total,
      visitors: point.devices,
    })),
  };
}

function mergeRanked(
  results: SourceResult[],
  key: "countries" | "devices" | "operatingSystems" | "pages" | "referrers",
  limit = 6,
) {
  const merged = new Map<string, AnalyticsRankedValue>();
  for (const item of results.flatMap((result) => result[key])) {
    const current = merged.get(item.key);
    merged.set(item.key, {
      key: item.key,
      pageViews: (current?.pageViews ?? 0) + item.pageViews,
      visitors: (current?.visitors ?? 0) + item.visitors,
    });
  }
  return [...merged.values()]
    .sort((a, b) => b.visitors - a.visitors || b.pageViews - a.pageViews)
    .slice(0, limit);
}

function weightedBounceRate(
  results: SourceResult[],
  period: "current" | "previous",
) {
  const values = results.map((result) =>
    period === "current" ? result.overview : result.previousOverview,
  );
  const visitors = values.reduce((total, value) => total + value.devices, 0);
  if (visitors === 0) return 0;
  return Math.round(
    values.reduce(
      (total, value) => total + (value.bounceRate ?? 0) * value.devices,
      0,
    ) / visitors,
  );
}

function mergeResults(
  results: SourceResult[],
  from: Date,
  to: Date,
): AnalyticsSnapshot {
  const timeseries = new Map<string, AnalyticsSnapshot["timeseries"][number]>();
  for (const point of results.flatMap((result) => result.timeseries)) {
    const current = timeseries.get(point.date);
    timeseries.set(point.date, {
      date: point.date,
      pageViews: (current?.pageViews ?? 0) + point.pageViews,
      visitors: (current?.visitors ?? 0) + point.visitors,
    });
  }

  // Vercel does not deduplicate a visitor who crosses from a generated URL to
  // a custom domain, so cross-host visitor totals are additive.
  const visitors = results.reduce(
    (total, result) => total + result.overview.devices,
    0,
  );
  const previousVisitors = results.reduce(
    (total, result) => total + result.previousOverview.devices,
    0,
  );
  const pageViews = results.reduce(
    (total, result) => total + result.overview.total,
    0,
  );
  const previousPageViews = results.reduce(
    (total, result) => total + result.previousOverview.total,
    0,
  );
  const bounceRate = weightedBounceRate(results, "current");
  const previousBounceRate = weightedBounceRate(results, "previous");

  return {
    capturedAt: to.toISOString(),
    range: {
      from: from.toISOString(),
      label: "Last 7 days",
      to: to.toISOString(),
    },
    totals: {
      bounceRate,
      online: results.reduce((total, result) => total + result.online, 0),
      pageViews,
      visitors,
    },
    comparisons: {
      bounceRate: percentChange(bounceRate, previousBounceRate),
      pageViews: percentChange(pageViews, previousPageViews),
      visitors: percentChange(visitors, previousVisitors),
    },
    timeseries: [...timeseries.values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
    pages: mergeRanked(results, "pages"),
    countries: mergeRanked(results, "countries"),
    devices: mergeRanked(results, "devices"),
    referrers: mergeRanked(results, "referrers"),
    operatingSystems: mergeRanked(results, "operatingSystems"),
  };
}

function sourcesFor(scope: SiteAnalyticsScope): AnalyticsSource[] {
  const relativePaths = scope.pagePaths.length > 0 ? scope.pagePaths : [[]];
  const sitePrefix = `/${scope.site.slug}`;
  const generatedPaths = relativePaths.map((segments) =>
    [sitePrefix, ...segments].join("/"),
  );
  const customPaths = relativePaths.map((segments) => `/${segments.join("/")}`);
  const sources: AnalyticsSource[] = [
    {
      hostname: [`${scope.organizationSlug}.${getRootDomain()}`],
      paths: [...new Set(generatedPaths)],
      sitePrefix,
    },
  ];

  if (scope.verifiedDomains.length > 0) {
    sources.push({
      hostname: [...new Set(scope.verifiedDomains)],
      paths: [...new Set(customPaths)],
    });
  }

  return sources;
}

function mockResponse(scope: SiteAnalyticsScope): SiteAnalyticsResponse {
  return {
    mode: "mock",
    snapshot: createMockAnalyticsSnapshot({
      pagePaths: scope.pagePaths,
      siteId: scope.site._id,
    }),
    status: "ready",
  };
}

export async function getSiteAnalytics(
  scope: SiteAnalyticsScope,
): Promise<SiteAnalyticsResponse> {
  const accessToken = process.env.VERCEL_ACCESS_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  const isProduction = process.env.VERCEL_ENV === "production";
  const liveMode = process.env.ANALYTICS_DATA_MODE === "live";
  const sources = sourcesFor(scope);

  if (sources.some((source) => source.paths.length > MAX_FILTER_PATHS)) {
    return {
      message: "This site has too many published routes to load analytics yet.",
      status: "unavailable",
    };
  }

  if (!liveMode) {
    return isProduction
      ? {
          message: "Analytics is not available yet.",
          status: "unavailable",
        }
      : mockResponse(scope);
  }

  if (!accessToken || !projectId || !teamId) {
    return isProduction
      ? {
          message: "Analytics is not configured for this deployment.",
          status: "unavailable",
        }
      : mockResponse(scope);
  }

  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  const previousFrom = new Date(from.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    const results = await Promise.all(
      sources.map((source) =>
        fetchSource({
          accessToken,
          from,
          previousFrom,
          projectId,
          source,
          teamId,
          to,
        }),
      ),
    );
    return {
      mode: "live",
      snapshot: mergeResults(results, from, to),
      status: "ready",
    };
  } catch {
    return isProduction
      ? {
          message: "Analytics is temporarily unavailable.",
          status: "unavailable",
        }
      : mockResponse(scope);
  }
}
