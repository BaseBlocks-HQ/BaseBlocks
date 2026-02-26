import { createAuth } from "../betterAuthSetup";

export const auth = createAuth({} as Parameters<typeof createAuth>[0]);
