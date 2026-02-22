import { createAuth } from "../betterAuthSetup";

// Export a static instance for Better Auth schema generation
export const auth = createAuth({} as Parameters<typeof createAuth>[0]);
