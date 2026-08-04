import "server-only";

import { getServerConvexClient } from "@/lib/convex/server";
import type { Id } from "@baseblocks/backend";
import { createHash } from "node:crypto";
import { makeFunctionReference } from "convex/server";
import { EditorAiConfigurationError } from "./orchestrator";
import type {
  EditorAiAdmission,
  EditorAiReplayResult,
  EditorAiRunBudget,
} from "./types";

type BeginResult =
  | {
      state: "admitted";
      runId: Id<"aiRuns">;
      budget: EditorAiRunBudget;
    }
  | { state: "replay"; runId: Id<"aiRuns">; result: EditorAiReplayResult };

const beginRun = makeFunctionReference<
  "mutation",
  {
    siteId: Id<"sites">;
    requestId: string;
    promptFingerprint: string;
    modelId: string;
  },
  BeginResult
>("aiRuns:begin");

const failRun = makeFunctionReference<
  "mutation",
  {
    runId: Id<"aiRuns">;
    failureCode: string;
  },
  null
>("aiRuns:fail");

export function createEditorAiAdmission(
  token: string,
  env: NodeJS.ProcessEnv = process.env,
): EditorAiAdmission {
  const convex = getServerConvexClient(token);
  return {
    async admit(request) {
      const modelId = env.EDITOR_AI_MODEL;
      if (!modelId) {
        throw new EditorAiConfigurationError(
          "EDITOR_AI_MODEL is not configured",
        );
      }
      const decision = await convex.mutation(beginRun, {
        siteId: request.siteId as Id<"sites">,
        requestId: request.requestId,
        promptFingerprint: createHash("sha256")
          .update(request.prompt)
          .digest("hex"),
        modelId,
      });
      return {
        replay: decision.state === "replay" ? decision.result : undefined,
        budget: decision.state === "admitted" ? decision.budget : undefined,
        fail: async (failureCode) => {
          await convex.mutation(failRun, {
            runId: decision.runId,
            failureCode,
          });
        },
      };
    },
  };
}
