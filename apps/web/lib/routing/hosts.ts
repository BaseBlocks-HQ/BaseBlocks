const DEFAULT_ROOT_DOMAIN = "baseblocks.dev";

export type RequestHost =
  | { kind: "root"; hostname: string }
  | { kind: "www"; hostname: string }
  | { kind: "subdomain"; hostname: string; organizationSlug: string }
  | { kind: "localhost"; hostname: string }
  | { kind: "localhost-subdomain"; hostname: string; organizationSlug: string }
  | { kind: "vercel-deployment"; hostname: string }
  | {
      kind: "vercel-preview";
      hostname: string;
      organizationSlug: string;
      deploymentHostname: string;
    }
  | { kind: "custom-domain"; hostname: string };

export function getRootDomain(): string {
  return normalizeHostname(
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? DEFAULT_ROOT_DOMAIN,
  );
}

export function normalizeHostname(host: string): string {
  const value = host.trim().toLowerCase();
  if (!value) return "";

  if (value.startsWith("[")) {
    const closingBracket = value.indexOf("]");
    return closingBracket === -1 ? value : value.slice(1, closingBracket);
  }

  return value.split(":")[0]?.replace(/\.$/, "") ?? "";
}

export function parseRequestHost(host: string): RequestHost {
  const hostname = normalizeHostname(host);
  const rootDomain = getRootDomain();

  if (hostname === rootDomain) return { kind: "root", hostname };
  if (hostname === `www.${rootDomain}`) return { kind: "www", hostname };

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  ) {
    return { kind: "localhost", hostname };
  }

  if (hostname.endsWith(".localhost")) {
    const organizationSlug = hostname.slice(0, -".localhost".length);
    return { kind: "localhost-subdomain", hostname, organizationSlug };
  }

  if (hostname.endsWith(`.${rootDomain}`)) {
    const organizationSlug = hostname.slice(0, -(rootDomain.length + 1));
    return { kind: "subdomain", hostname, organizationSlug };
  }

  if (hostname.endsWith(".vercel.app")) {
    const [prefix, deploymentHostname] = hostname.split("---", 2);
    if (prefix && deploymentHostname) {
      return {
        kind: "vercel-preview",
        hostname,
        organizationSlug: prefix,
        deploymentHostname,
      };
    }
    return { kind: "vercel-deployment", hostname };
  }

  return { kind: "custom-domain", hostname };
}

export function normalizePathSegments(
  path: string | string[] | undefined,
): string[] {
  const segments = Array.isArray(path) ? path : (path?.split("/") ?? []);
  return segments.map((segment) => segment.trim()).filter(Boolean);
}

export function encodePath(segments: string[]): string {
  return segments.map(encodeURIComponent).join("/");
}
