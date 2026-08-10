import { describe, expect, test } from "bun:test";
import { getPageAccessOrNull } from "./permissions";

const site = {
  _id: "site-1",
  organizationId: "organization-1",
};
const root = {
  _id: "page-root",
  siteId: "site-1",
};
const child = {
  _id: "page-child",
  siteId: "site-1",
  parentId: "page-root",
};

function permissionContext({
  grantOrganizationId = "organization-1",
  grantStatus = "active",
  memberRole,
}: {
  grantOrganizationId?: string;
  grantStatus?: "active" | "revoked";
  memberRole?: string;
} = {}) {
  const documents = new Map<string, Record<string, unknown>>([
    [site._id, site],
    [root._id, root],
    [child._id, child],
  ]);
  const grants = [
    {
      _id: "grant-1",
      organizationId: grantOrganizationId,
      siteId: "site-1",
      pageId: "page-root",
      userId: "user-1",
      permission: "viewer",
      status: grantStatus,
    },
  ];
  return {
    auth: {
      getUserIdentity: () =>
        Promise.resolve({ subject: "user-1", email: "guest@example.com" }),
    },
    runQuery: () =>
      Promise.resolve(
        memberRole
          ? {
              _id: "member-1",
              organizationId: "organization-1",
              role: memberRole,
              userId: "user-1",
            }
          : null,
      ),
    db: {
      get: (id: string) => Promise.resolve(documents.get(id) ?? null),
      query: () => ({
        withIndex: (_name: string, build: (query: unknown) => unknown) => {
          const values: Record<string, string> = {};
          const query = {
            eq(field: string, value: string) {
              values[field] = value;
              return query;
            },
          };
          build(query);
          const matching = grants.filter((grant) =>
            Object.entries(values).every(
              ([field, value]) => grant[field as keyof typeof grant] === value,
            ),
          );
          return {
            first: () => Promise.resolve(matching[0] ?? null),
            collect: () => Promise.resolve(matching),
          };
        },
      }),
    },
  };
}

describe("central page authorization", () => {
  test("inherits a guest grant to descendants but not parents", async () => {
    const ctx = permissionContext();
    const access = await getPageAccessOrNull(
      ctx as never,
      "page-child" as never,
    );
    expect(access).toMatchObject({
      source: "guest",
      permission: "viewer",
      grantRootPageId: "page-root",
    });
  });

  test("revoked and cross-workspace grants fail closed", async () => {
    expect(
      await getPageAccessOrNull(
        permissionContext({ grantStatus: "revoked" }) as never,
        "page-child" as never,
      ),
    ).toBeNull();
    expect(
      await getPageAccessOrNull(
        permissionContext({ grantOrganizationId: "other" }) as never,
        "page-child" as never,
      ),
    ).toBeNull();
  });

  test("workspace membership takes precedence over guest grants", async () => {
    const access = await getPageAccessOrNull(
      permissionContext({ memberRole: "editor" }) as never,
      "page-child" as never,
    );
    expect(access).toMatchObject({ source: "member", permission: "editor" });
  });
});
