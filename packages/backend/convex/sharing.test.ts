import { describe, expect, test } from "bun:test";
import {
  canRenderPublishedSite,
  classifyPublishedSiteAccess,
} from "./sharing";

describe("published site access", () => {
  test("unpublished sites are unavailable to every audience", () => {
    const access = classifyPublishedSiteAccess(
      { isPublished: false, visibility: "public" },
      { isAuthenticated: true, isMember: true },
    );
    expect(access).toEqual({ kind: "unpublished" });
    expect(canRenderPublishedSite(access)).toBe(false);
  });

  test("public sites are available without authentication", () => {
    const access = classifyPublishedSiteAccess(
      { isPublished: true, visibility: "public" },
      { isAuthenticated: false, isMember: false },
    );
    expect(access).toEqual({ kind: "public" });
    expect(canRenderPublishedSite(access)).toBe(true);
  });

  test("private sites require authentication", () => {
    const access = classifyPublishedSiteAccess(
      { isPublished: true, visibility: "private" },
      { isAuthenticated: false, isMember: false },
    );
    expect(access).toEqual({ kind: "authentication-required" });
    expect(canRenderPublishedSite(access)).toBe(false);
  });

  test("private sites reject authenticated non-members", () => {
    const access = classifyPublishedSiteAccess(
      { isPublished: true, visibility: "private" },
      { isAuthenticated: true, isMember: false },
    );
    expect(access).toEqual({ kind: "forbidden" });
    expect(canRenderPublishedSite(access)).toBe(false);
  });

  test("private sites render for authenticated team members", () => {
    const access = classifyPublishedSiteAccess(
      { isPublished: true, visibility: "private" },
      { isAuthenticated: true, isMember: true },
    );
    expect(access).toEqual({ kind: "private-member" });
    expect(canRenderPublishedSite(access)).toBe(true);
  });
});
