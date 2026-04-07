import { describe, expect, test } from "bun:test";
import { mergeMemberProfiles } from "./profileMerge";

describe("member profile merge", () => {
  test("prefers live auth profile fields when available", () => {
    expect(
      mergeMemberProfiles(
        [
          {
            _id: "member_1",
            userId: "user_1",
            email: "old@example.com",
            name: "Old Name",
            imageUrl: "https://old.example.com/avatar.png",
            role: "admin",
            joinedAt: 1,
          },
        ],
        [
          {
            _id: "user_1",
            email: "new@example.com",
            name: "New Name",
            image: "https://lh3.googleusercontent.com/avatar",
          },
        ],
      ),
    ).toEqual([
      {
        _id: "member_1",
        userId: "user_1",
        email: "new@example.com",
        name: "New Name",
        imageUrl: "https://lh3.googleusercontent.com/avatar",
        role: "admin",
        joinedAt: 1,
      },
    ]);
  });

  test("falls back to stored member snapshot when auth user is missing", () => {
    expect(
      mergeMemberProfiles(
        [
          {
            _id: "member_1",
            userId: "user_1",
            email: "stored@example.com",
            name: "Stored Name",
            imageUrl: "https://stored.example.com/avatar.png",
            role: "editor",
            joinedAt: 1,
          },
        ],
        [],
      ),
    ).toEqual([
      {
        _id: "member_1",
        userId: "user_1",
        email: "stored@example.com",
        name: "Stored Name",
        imageUrl: "https://stored.example.com/avatar.png",
        role: "editor",
        joinedAt: 1,
      },
    ]);
  });

  test("clears stale stored image when live auth profile has no image", () => {
    expect(
      mergeMemberProfiles(
        [
          {
            _id: "member_1",
            userId: "user_1",
            email: "stored@example.com",
            name: "Stored Name",
            imageUrl: "https://stored.example.com/avatar.png",
            role: "viewer",
            joinedAt: 1,
          },
        ],
        [
          {
            _id: "user_1",
            email: "live@example.com",
            name: "Live Name",
            image: null,
          },
        ],
      ),
    ).toEqual([
      {
        _id: "member_1",
        userId: "user_1",
        email: "live@example.com",
        name: "Live Name",
        imageUrl: undefined,
        role: "viewer",
        joinedAt: 1,
      },
    ]);
  });
});
