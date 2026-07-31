export interface AnalyticsRankedValue {
  key: string;
  pageViews: number;
  visitors: number;
}

export interface AnalyticsTimeseriesPoint {
  date: string;
  pageViews: number;
  visitors: number;
}

export interface AnalyticsSnapshot {
  capturedAt: string;
  range: {
    from: string;
    to: string;
    label: string;
  };
  totals: {
    bounceRate: number;
    online: number;
    pageViews: number;
    visitors: number;
  };
  comparisons: {
    bounceRate: number;
    pageViews: number;
    visitors: number;
  };
  timeseries: AnalyticsTimeseriesPoint[];
  pages: AnalyticsRankedValue[];
  countries: AnalyticsRankedValue[];
  devices: AnalyticsRankedValue[];
  referrers: AnalyticsRankedValue[];
  operatingSystems: AnalyticsRankedValue[];
}

export type SiteAnalyticsResponse =
  | {
      mode: "live" | "mock";
      snapshot: AnalyticsSnapshot;
      status: "ready";
    }
  | {
      message: string;
      status: "unavailable";
    };
