import { describe, expect, test } from "bun:test";
import {
  canViewerAccessPublishedPage,
  getPublishedPageAccessPolicy,
} from "./pageAccess";

describe("page access", () => {
  test("getPublishedPageAccessPolicy_ignoresDraftPolicyWhenPublishedPolicyIsMissing", () => {
    expect(
      getPublishedPageAccessPolicy({
        publishedAccessPolicy: undefined,
      }),
    ).toEqual({
      kind: "public",
    });
  });

  test("canViewerAccessPublishedPage_keepsUndeployedDraftRestrictionsOffTheLiveSite", () => {
    expect(
      canViewerAccessPublishedPage(
        {
          accessPolicy: {
            kind: "audiences",
            audienceIds: ["audience_1"],
          },
          publishedAccessPolicy: undefined,
        },
        {
          audienceIds: new Set<string>(),
          isTeamMember: false,
        },
      ),
    ).toBe(true);
  });

  test("canViewerAccessPublishedPage_usesPublishedAudienceRestrictions", () => {
    expect(
      canViewerAccessPublishedPage(
        {
          accessPolicy: {
            kind: "public",
          },
          publishedAccessPolicy: {
            kind: "audiences",
            audienceIds: ["audience_1"],
          },
        },
        {
          audienceIds: new Set(["audience_2"]),
          isTeamMember: true,
        },
      ),
    ).toBe(false);
  });
});
