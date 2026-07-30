import * as flags from "@/flags";
import { getProviderData } from "@flags-sdk/vercel";
import { createFlagsDiscoveryEndpoint } from "flags/next";

export const GET = createFlagsDiscoveryEndpoint(() => getProviderData(flags));
