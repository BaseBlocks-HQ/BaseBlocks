import {
  canAccessPagePolicy,
  normalizePageAccessPolicy,
  publicPageAccessPolicy,
} from "./page-access";

describe("page access policy", () => {
  test("normalizePageAccessPolicy_returnsPublicWhenAudienceListIsEmpty", () => {
    expect(
      normalizePageAccessPolicy({
        kind: "audiences",
        audienceIds: [],
      }),
    ).toEqual(publicPageAccessPolicy);
  });

  test("normalizePageAccessPolicy_deduplicatesAudienceIds", () => {
    expect(
      normalizePageAccessPolicy({
        kind: "audiences",
        audienceIds: ["managers", "managers", "hr"],
      }),
    ).toEqual({
      kind: "audiences",
      audienceIds: ["managers", "hr"],
    });
  });

  test("canAccessPagePolicy_allowsMatchingAudience", () => {
    expect(
      canAccessPagePolicy(
        {
          kind: "audiences",
          audienceIds: ["managers"],
        },
        ["managers"],
      ),
    ).toBe(true);
  });

  test("canAccessPagePolicy_deniesMissingAudience", () => {
    expect(
      canAccessPagePolicy(
        {
          kind: "audiences",
          audienceIds: ["managers"],
        },
        ["employees"],
      ),
    ).toBe(false);
  });
});
