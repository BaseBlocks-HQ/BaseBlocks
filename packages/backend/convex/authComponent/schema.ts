import { defineSchema } from "convex/server";
import { tables } from "./generatedSchema";

const schema = defineSchema({
  ...tables,
  member: tables.member.index("organizationId_userId", [
    "organizationId",
    "userId",
  ]),
});

export default schema;
