import { type GenericCtx, createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { type BetterAuthOptions, betterAuth } from "better-auth/minimal";
import { organization } from "better-auth/plugins";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import {
  baseBlocksAccessControl,
  baseBlocksRoles,
} from "./authComponent/permissions";
import authSchema from "./authComponent/schema";

const defaultAuthOrigin = "http://localhost:3001";

function parseAuthOrigin(origin: string, envName = "APP_URL"): string {
  const trimmed = origin.trim();
  if (!trimmed) {
    throw new Error(`${envName} includes an empty origin`);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch (error) {
    throw new Error(`${envName} contains an invalid origin: ${trimmed}`, {
      cause: error,
    });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${envName} origin must use http or https: ${trimmed}`);
  }

  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error(
      `${envName} must contain origins only, without paths or query strings: ${trimmed}`,
    );
  }

  return parsed.origin;
}

function getAuthOrigins(): string[] {
  const rawOrigins = (process.env.APP_URL ?? defaultAuthOrigin)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (rawOrigins.length === 0) {
    throw new Error("APP_URL must include at least one origin");
  }

  const seen = new Set<string>();
  const origins: string[] = [];

  for (const rawOrigin of rawOrigins) {
    const origin = parseAuthOrigin(rawOrigin);
    if (seen.has(origin)) continue;
    seen.add(origin);
    origins.push(origin);
  }

  return origins;
}

function getAuthUrlConfig() {
  const authOrigins = getAuthOrigins();
  const primaryAppUrl = authOrigins[0]!;
  const primaryAppHostname = new URL(primaryAppUrl).hostname;
  const crossSubdomainCookieDomain =
    primaryAppHostname === "localhost" ||
    primaryAppHostname === "127.0.0.1" ||
    primaryAppHostname.endsWith(".vercel.app")
      ? undefined
      : primaryAppHostname;

  return {
    baseURL: primaryAppUrl,
    trustedOrigins: crossSubdomainCookieDomain
      ? [...authOrigins, `https://*.${crossSubdomainCookieDomain}`]
      : authOrigins,
    crossSubdomainCookieDomain,
  };
}

export const authComponent = createClient<DataModel, never>(
  components.betterAuth,
  {
    local: {
      schema: authSchema as never,
    },
    verbose: false,
  },
);

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  const { baseURL, trustedOrigins, crossSubdomainCookieDomain } =
    getAuthUrlConfig();

  return {
    baseURL,
    trustedOrigins,
    database: authComponent.adapter(ctx),
    advanced: {
      database: {
        generateId: false,
      },
      ...(crossSubdomainCookieDomain
        ? {
            crossSubDomainCookies: {
              enabled: true,
              domain: crossSubdomainCookieDomain,
            },
          }
        : {}),
    },
    emailAndPassword: {
      enabled: false,
    },
    user: {
      deleteUser: {
        enabled: true,
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google", "github", "microsoft"],
        allowDifferentEmails: false,
      },
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        prompt: "select_account",
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        prompt: "select_account",
      },
      microsoft: {
        clientId: process.env.MICROSOFT_CLIENT_ID!,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
        tenantId: process.env.MICROSOFT_TENANT_ID || "common",
        authority: "https://login.microsoftonline.com",
        prompt: "select_account",
      },
    },
    plugins: [
      organization({
        ac: baseBlocksAccessControl,
        roles: baseBlocksRoles,
        creatorRole: "owner",
        allowUserToCreateOrganization: true,
        cancelPendingInvitationsOnReInvite: true,
        requireEmailVerificationOnInvitation: true,
      }),
      convex({ authConfig }),
    ],
  } satisfies BetterAuthOptions;
};

export const options = createAuthOptions({} as GenericCtx<DataModel>);

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));

export const { getAuthUser } = authComponent.clientApi();
