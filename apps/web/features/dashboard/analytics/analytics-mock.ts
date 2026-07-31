import "server-only";

import type {
  AnalyticsRankedValue,
  AnalyticsSnapshot,
} from "./analytics-types";

function hash(value: string) {
  return [...value].reduce(
    (result, character) => (result * 31 + character.charCodeAt(0)) >>> 0,
    2166136261,
  );
}

function ranked(
  values: string[],
  seed: number,
  base: number,
): AnalyticsRankedValue[] {
  return values.map((key, index) => {
    const visitors = Math.max(
      1,
      Math.round(base / (index + 1) + ((seed >>> (index % 8)) % 7)),
    );
    return {
      key,
      visitors,
      pageViews: visitors + 3 + ((seed + index * 11) % 19),
    };
  });
}

export function createMockAnalyticsSnapshot({
  pagePaths,
  siteId,
}: {
  pagePaths: string[][];
  siteId: string;
}): AnalyticsSnapshot {
  const seed = hash(siteId);
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  const pageLabels = (pagePaths.length > 0 ? pagePaths : [[], ["example-page"]])
    .slice(0, 6)
    .map((segments) => `/${segments.join("/")}`.replace(/\/$/, "/"));
  const timeseries = Array.from({ length: 8 }, (_, index) => {
    const date = new Date(from.getTime() + index * 24 * 60 * 60 * 1000);
    const visitors = 8 + ((seed >>> (index % 12)) % 18);
    return {
      date: date.toISOString().slice(0, 10),
      visitors,
      pageViews: visitors * 2 + ((seed + index * 13) % 22),
    };
  });
  const visitors = timeseries.reduce(
    (total, point) => total + point.visitors,
    0,
  );
  const pageViews = timeseries.reduce(
    (total, point) => total + point.pageViews,
    0,
  );

  return {
    capturedAt: to.toISOString(),
    range: {
      from: from.toISOString(),
      label: "Last 7 days",
      to: to.toISOString(),
    },
    totals: {
      bounceRate: 34 + (seed % 25),
      online: seed % 5,
      pageViews,
      visitors,
    },
    comparisons: {
      bounceRate: (seed % 13) - 6,
      pageViews: ((seed >>> 3) % 35) - 12,
      visitors: ((seed >>> 6) % 27) - 8,
    },
    timeseries,
    pages: ranked(pageLabels, seed, Math.max(12, Math.round(visitors / 2))),
    countries: ranked(["Country 1", "Country 2", "Country 3"], seed, 34),
    devices: ranked(["Desktop", "Mobile", "Tablet"], seed, 48),
    referrers: ranked(["Direct", "Search", "Social"], seed, 25),
    operatingSystems: ranked(["Desktop OS", "Mobile OS", "Other OS"], seed, 39),
  };
}
