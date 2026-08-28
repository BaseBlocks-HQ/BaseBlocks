import { type GenericCtx, createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { createAuthMiddleware } from "better-auth/api";
import { type BetterAuthOptions, betterAuth } from "better-auth/minimal";
import { oAuthProxy, organization } from "better-auth/plugins";
import { internal } from "./_generated/api";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import {
  baseBlocksAccessControl,
  baseBlocksRoles,
} from "./authComponent/permissions";
import authSchema from "./authComponent/schema";
import {
  MAX_OWNED_ORGANIZATIONS,
  hasOrganizationRole,
  hasReachedOwnedOrganizationLimit,
} from "./authComponent/organizationPolicy";
import { authPage, type AuthMember } from "./authComponent/model";
import { parseWorkspaceCreationHint } from "./model/workspaceFoundation";

const defaultAuthOrigin = "http://localhost:3001";
const productionAuthOrigin = "https://baseblocks.dev";

async function ownedOrganizationLimitReached(
  ctx: GenericCtx<DataModel>,
  userId: string,
): Promise<boolean> {
  const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
    model: "member",
    where: [
      { field: "userId", operator: "eq", value: userId },
      { field: "role", operator: "contains", value: "owner" },
    ],
    paginationOpts: {
      numItems: MAX_OWNED_ORGANIZATIONS + 1,
      cursor: null,
    },
  });
  return hasReachedOwnedOrganizationLimit(result.page);
}

async function prepareAccountDeletion(
  ctx: GenericCtx<DataModel>,
  userId: string,
): Promise<void> {
  const memberships = authPage<AuthMember>(
    await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "member",
      where: [{ field: "userId", operator: "eq", value: userId }],
      paginationOpts: { numItems: 250, cursor: null },
    }),
  );
  if (
    memberships.some((membership) =>
      hasOrganizationRole(membership.role, "owner"),
    )
  ) {
    throw new Error(
      "Transfer or delete every owned workspace before deleting your account",
    );
  }
  await (
    ctx as unknown as {
      runMutation: (reference: unknown, args: unknown) => Promise<unknown>;
    }
  ).runMutation(internal.organizations.deleteAccountApplicationAccess, {
    userId,
  });
  const mutationCtx = ctx as unknown as {
    runMutation: (
      reference: typeof components.betterAuth.adapter.deleteMany,
      args: unknown,
    ) => Promise<unknown>;
  };
  await mutationCtx.runMutation(components.betterAuth.adapter.deleteMany, {
    input: {
      model: "member",
      where: [{ field: "userId", operator: "eq", value: userId }],
    } as never,
    paginationOpts: { numItems: 250, cursor: null },
  });
}

async function schedulePaidSeatSync(
  ctx: GenericCtx<DataModel>,
  organizationId: string,
) {
  const scheduler = (
    ctx as unknown as {
      scheduler: {
        runAfter: (
          delayMs: number,
          reference: unknown,
          args: { organizationId: string },
        ) => Promise<unknown>;
      };
    }
  ).scheduler;
  await scheduler.runAfter(0, internal.billing.syncPaidSeatsFromMembership, {
    organizationId,
  });
}

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
    primaryAppHostname === new URL(productionAuthOrigin).hostname
      ? primaryAppHostname
      : undefined;

  return {
    baseURL: {
      allowedHosts: [
        ...authOrigins.map((origin) => new URL(origin).host),
        ...(crossSubdomainCookieDomain
          ? [`*.${crossSubdomainCookieDomain}`]
          : []),
      ],
      fallback: primaryAppUrl,
      protocol: "auto" as const,
    },
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
  const convexPlugin = convex({ authConfig });
  const convexTokenEndpoint = convexPlugin.endpoints?.getToken;

  if (!convexTokenEndpoint) {
    throw new Error("Convex Better Auth plugin is missing its token endpoint");
  }

  // @convex-dev/better-auth does not include the OAuth proxy callback in the
  // matcher that writes the Convex JWT cookie. The proxy does create
  // `newSession`, so generate the SSR token from that session here.
  convexPlugin.hooks?.after?.push({
    matcher: (hookContext) => hookContext.path === "/oauth-proxy-callback",
    handler: createAuthMiddleware(async (hookContext) => {
      const newSession = hookContext.context.newSession;
      if (!newSession) return;

      const originalSession = hookContext.context.session;
      hookContext.context.session = newSession;
      try {
        await convexTokenEndpoint({
          ...hookContext,
          headers: new Headers(),
          method: "GET",
          asResponse: false,
          returnHeaders: false,
          returnStatus: false,
        } as never);
      } finally {
        hookContext.context.session = originalSession;
      }
    }),
  });

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
        beforeDelete: async (user) => {
          await prepareAccountDeletion(ctx, user.id);
        },
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
        tenantId: process.env.MICROSOFT_TENANT_ID!,
        authority: "https://login.microsoftonline.com",
        prompt: "select_account",
      },
    },
    plugins: [
      oAuthProxy({
        productionURL: productionAuthOrigin,
        secret: process.env.OAUTH_PROXY_SECRET!,
      }),
      organization({
        ac: baseBlocksAccessControl,
        roles: baseBlocksRoles,
        creatorRole: "owner",
        allowUserToCreateOrganization: true,
        organizationLimit: async (user) =>
          await ownedOrganizationLimitReached(ctx, user.id),
        cancelPendingInvitationsOnReInvite: true,
        requireEmailVerificationOnInvitation: true,
        organizationHooks: {
          afterCreateOrganization: async ({ organization, user }) => {
            const hint = parseWorkspaceCreationHint(organization.metadata) ?? {
              intent: "work" as const,
              source: "onboarding" as const,
            };
            const workspaceProfilesApi = (
              internal as unknown as {
                workspaceProfiles: { upsertFromAuthHook: unknown };
              }
            ).workspaceProfiles;
            const mutationCtx = ctx as unknown as {
              runMutation: (
                reference: never,
                args: unknown,
              ) => Promise<unknown>;
            };
            await mutationCtx.runMutation(
              workspaceProfilesApi.upsertFromAuthHook as never,
              {
                organizationId: organization.id,
                createdBy: user.id,
                ...hint,
              },
            );
          },
          afterAddMember: async ({ member }) => {
            await schedulePaidSeatSync(ctx, member.organizationId);
          },
          afterRemoveMember: async ({ member }) => {
            await schedulePaidSeatSync(ctx, member.organizationId);
          },
          afterUpdateMemberRole: async ({ member }) => {
            await schedulePaidSeatSync(ctx, member.organizationId);
          },
        },
      }),
      convexPlugin,
    ],
  } satisfies BetterAuthOptions;
};

export const options = createAuthOptions({} as GenericCtx<DataModel>);

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));

export const { getAuthUser } = authComponent.clientApi();
