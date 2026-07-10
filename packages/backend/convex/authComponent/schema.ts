import { defineSchema } from "convex/server";
import { tables } from "./generatedSchema";

// Better Auth's adapter selects this compound index for membership lookups.
// Keep custom indexes here so regenerating generatedSchema.ts cannot erase them.
const schema = defineSchema({
  ...tables,
  member: tables.member.index("organizationId_userId", [
    "organizationId",
    "userId",
  ]),
});

export default schema;
