import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const tables = {
  user: defineTable({
    name: v.string(),
    email: v.string(),
    emailVerified: v.boolean(),
    image: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("email", ["email"]),
  session: defineTable({
    expiresAt: v.number(),
    token: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    ipAddress: v.optional(v.union(v.null(), v.string())),
    userAgent: v.optional(v.union(v.null(), v.string())),
    userId: v.string(),
    activeOrganizationId: v.optional(v.union(v.null(), v.string())),
  })
    .index("token", ["token"])
    .index("userId", ["userId"]),
  account: defineTable({
    accountId: v.string(),
    providerId: v.string(),
    userId: v.string(),
    accessToken: v.optional(v.union(v.null(), v.string())),
    refreshToken: v.optional(v.union(v.null(), v.string())),
    idToken: v.optional(v.union(v.null(), v.string())),
    accessTokenExpiresAt: v.optional(v.union(v.null(), v.number())),
    refreshTokenExpiresAt: v.optional(v.union(v.null(), v.number())),
    scope: v.optional(v.union(v.null(), v.string())),
    password: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("accountId", ["accountId"])
    .index("accountId_providerId", ["accountId", "providerId"])
    .index("userId", ["userId"]),
  verification: defineTable({
    identifier: v.string(),
    value: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("identifier", ["identifier"])
    .index("expiresAt", ["expiresAt"]),
  jwks: defineTable({
    publicKey: v.string(),
    privateKey: v.string(),
    createdAt: v.number(),
    expiresAt: v.optional(v.union(v.null(), v.number())),
  }),
  // Organization plugin tables
  organization: defineTable({
    name: v.string(),
    slug: v.optional(v.union(v.null(), v.string())),
    logo: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
    metadata: v.optional(v.union(v.null(), v.string())),
  }).index("slug", ["slug"]),
  member: defineTable({
    organizationId: v.string(),
    userId: v.string(),
    role: v.string(),
    createdAt: v.number(),
  })
    .index("organizationId", ["organizationId"])
    .index("organizationId_userId", ["organizationId", "userId"])
    .index("userId", ["userId"]),
  invitation: defineTable({
    organizationId: v.string(),
    email: v.string(),
    role: v.optional(v.union(v.null(), v.string())),
    status: v.string(),
    inviterId: v.string(),
    expiresAt: v.number(),
    createdAt: v.optional(v.union(v.null(), v.number())),
  })
    .index("organizationId", ["organizationId"])
    .index("email", ["email"]),
};

const schema = defineSchema(tables);

export default schema;
