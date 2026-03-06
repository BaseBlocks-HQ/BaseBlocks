import { type GenericCtx, createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { type BetterAuthOptions, betterAuth } from "better-auth/minimal";
import { organization } from "better-auth/plugins";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import authSchema from "./authComponent/schema";

const appUrl = (process.env.APP_URL ?? "")
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);

const primaryAppUrl = appUrl[0] || "";

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
    trustedOrigins: appUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: false,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        redirectURI: `${primaryAppUrl}/api/auth/callback/google`,
      },
    },
    plugins: [
      organization({
        allowUserToCreateOrganization: true,
      }),
      convex({ authConfig }),
    ],
  }) satisfies BetterAuthOptions;

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));

export const { getAuthUser } = authComponent.clientApi();
