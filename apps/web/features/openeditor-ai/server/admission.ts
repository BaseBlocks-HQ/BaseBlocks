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
  EditorAiRunnerOutput,
} from "./types";

type BeginResult =
  | {
      state: "admitted";
      runId: Id<"aiRuns">;
      budget: EditorAiRunBudget;
      attribution: {
        organizationId: string;
        actorId: string;
        feature: string;
        environment: "sandbox" | "production";
        policyVersion: string;
      };
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
    failureMessage?: string;
    telemetry?: EditorAiRunnerOutput["telemetry"];
  },
  null
>("aiRuns:fail");

const settleRun = makeFunctionReference<
  "mutation",
  {
    runId: Id<"aiRuns">;
    telemetry: NonNullable<EditorAiRunnerOutput["telemetry"]>;
  },
  "settled" | "released" | "reconcilePending"
>("aiRuns:settle");

const completeAnswerRun = makeFunctionReference<
  "mutation",
  {
    runId: Id<"aiRuns">;
    conversationId?: Id<"aiConversations">;
    summary: string;
    telemetry?: EditorAiRunnerOutput["telemetry"];
  },
  null
>("aiRuns:completeAnswer");

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
        attribution:
          decision.state === "admitted"
            ? {
                runId: decision.runId,
                ...decision.attribution,
              }
            : undefined,
        settle: (telemetry) =>
          convex.mutation(settleRun, { runId: decision.runId, telemetry }),
        completeAnswer: async (input) => {
          await convex.mutation(completeAnswerRun, {
            runId: decision.runId,
            conversationId: input.conversationId as
              | Id<"aiConversations">
              | undefined,
            summary: input.summary,
            telemetry: input.telemetry,
          });
        },
        fail: async (failureCode, details) => {
          await convex.mutation(failRun, {
            runId: decision.runId,
            failureCode,
            failureMessage: details?.message,
            telemetry: details?.telemetry,
          });
        },
      };
    },
  };
}
