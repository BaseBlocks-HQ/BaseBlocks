import { type GenericCtx, createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { type BetterAuthOptions, betterAuth } from "better-auth/minimal";
import { organization } from "better-auth/plugins";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import authSchema from "./authComponent/schema";
import { parseAuthOrigins } from "./authOrigins";

const authOrigins = parseAuthOrigins(process.env.APP_URL);
const primaryAppUrl = authOrigins[0]!;
const primaryAppHostname = new URL(primaryAppUrl).hostname;
const crossSubdomainCookieDomain =
  primaryAppHostname === "localhost" ||
  primaryAppHostname === "127.0.0.1" ||
  primaryAppHostname.endsWith(".vercel.app")
    ? undefined
    : primaryAppHostname;
const trustedOrigins = crossSubdomainCookieDomain
  ? [...authOrigins, `https://*.${crossSubdomainCookieDomain}`]
  : authOrigins;
export const authComponent = createClient<DataModel, never>(
  components.betterAuth,
  {
    local: {
      schema: authSchema as never,
    },
    verbose: false,
  },
);

export const createAuthOptions = (ctx: GenericCtx<DataModel>) =>
  ({
    baseURL: primaryAppUrl,
    trustedOrigins,
    database: authComponent.adapter(ctx),
    advanced: crossSubdomainCookieDomain
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: crossSubdomainCookieDomain,
          },
        }
      : undefined,
    emailAndPassword: {
      enabled: false,
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
        allowUserToCreateOrganization: true,
        cancelPendingInvitationsOnReInvite: true,
      }),
      convex({ authConfig }),
    ],
  }) satisfies BetterAuthOptions;

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));

export const { getAuthUser } = authComponent.clientApi();
