type MemberProfileSnapshot<TMemberId = string> = {
  _id: TMemberId;
  userId: string;
  email: string;
  name?: string;
  imageUrl?: string;
  role: string;
  joinedAt: number;
};

type LiveAuthUserProfile = {
  _id: string;
  email: string;
  name: string;
  image?: string | null;
};

export function mergeMemberProfiles<TMember extends MemberProfileSnapshot>(
  members: TMember[],
  authUsers: LiveAuthUserProfile[],
) {
  const authUsersById = new Map(authUsers.map((user) => [user._id, user]));

  return members.map((member) => {
    const authUser = authUsersById.get(member.userId);

    if (!authUser) {
      return member;
    }

    return {
      ...member,
      email: authUser.email,
      name: authUser.name,
      imageUrl: authUser.image ?? undefined,
    };
  });
}
