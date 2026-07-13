import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";

export type AuthDataCtx =
  | GenericQueryCtx<DataModel>
  | GenericMutationCtx<DataModel>;

export type AuthOrganization = {
  _id: string;
  createdAt: number;
  logo?: string | null;
  name: string;
  slug?: string | null;
};

export type AuthMember = {
  _id: string;
  createdAt: number;
  organizationId: string;
  role: string;
  userId: string;
};

export type AuthUser = {
  _id: string;
  email: string;
  image?: string | null;
  name: string;
};

export function authPage<T>(result: unknown): T[] {
  return result && typeof result === "object" && "page" in result
    ? ((result as { page: T[] }).page ?? [])
    : [];
}

export async function getAuthOrganizationById(
  ctx: AuthDataCtx,
  organizationId: string,
): Promise<AuthOrganization | null> {
  return (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "organization",
    where: [{ field: "_id", operator: "eq", value: organizationId }],
  })) as AuthOrganization | null;
}

export async function getAuthOrganizationBySlug(
  ctx: AuthDataCtx,
  slug: string,
): Promise<AuthOrganization | null> {
  return (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "organization",
    where: [{ field: "slug", operator: "eq", value: slug }],
  })) as AuthOrganization | null;
}
