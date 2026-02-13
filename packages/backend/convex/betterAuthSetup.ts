import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { organization } from "better-auth/plugins";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";

const siteUrl = process.env.SITE_URL ?? ""; // Convex site URL (where auth routes live)
const appUrls = (process.env.APP_URL ?? "").split(",").map((u) => u.trim()).filter(Boolean); // Frontend URL(s)
const appUrl = appUrls[0] ?? ""; // Primary frontend URL (for crossDomain)

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- monorepo type resolution workaround
export const authComponent = createClient<DataModel, any>(
  components.betterAuth,
  {
    local: {
      schema: authSchema,
    },
    verbose: false,
  },
);

export const createAuthOptions = (ctx: GenericCtx<DataModel>) =>
  ({
    baseURL: siteUrl,
    trustedOrigins: appUrls,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: false,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },
    plugins: [
      organization({
        allowUserToCreateOrganization: true,
      }),
      crossDomain({ siteUrl: appUrl }),
      convex({ authConfig }),
    ],
  }) satisfies BetterAuthOptions;

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));

export const getAuthUser = async (ctx: GenericCtx<DataModel>) => {
  return authComponent.getAuthUser(ctx);
};
