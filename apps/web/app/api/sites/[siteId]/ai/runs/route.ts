import { createConvexEditorAiBackend } from "@/features/openeditor-ai/server/backend";
import { createEditorAiAdmission } from "@/features/openeditor-ai/server/admission";
import { createEditorAiConversationBackend } from "@/features/openeditor-ai/server/conversations";
import {
  createEditorAiOrchestrator,
  EditorAiConfigurationError,
  EditorAiValidationError,
} from "@/features/openeditor-ai/server/orchestrator";
import { getEditorAiReadiness } from "@/features/openeditor-ai/server/readiness";
import { createProductionEditorAiRunner } from "@/features/openeditor-ai/server/runners";
import { getToken } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_REQUEST_BYTES = 12_000;
const requestSchema = z
  .object({
    prompt: z.string().min(1).max(8_000),
    conversationId: z.string().min(1).optional(),
  })
  .strict();

async function requireToken() {
  const token = await getToken();
  return token || null;
}

export async function GET() {
  if (!(await requireToken())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(
    { editorAi: getEditorAiReadiness() },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ siteId: string }> },
) {
  const token = await requireToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const requestId = request.headers.get("idempotency-key")?.trim();
  if (!requestId || requestId.length < 16 || requestId.length > 200) {
    return NextResponse.json(
      { error: "A valid Idempotency-Key header is required" },
      { status: 400 },
    );
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_REQUEST_BYTES) {
    return NextResponse.json(
      { error: "Request is too large" },
      { status: 413 },
    );
  }

  try {
    const raw = await request.text();
    if (raw.length > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        { error: "Request is too large" },
        { status: 413 },
      );
    }
    const body = requestSchema.parse(JSON.parse(raw));
    const { siteId } = await context.params;
    const conversation = body.conversationId
      ? createEditorAiConversationBackend(token)
      : null;
    const prompt = conversation
      ? await conversation.begin({
          conversationId: body.conversationId!,
          requestId,
          content: body.prompt,
        })
      : body.prompt;
    const orchestrator = createEditorAiOrchestrator({
      backend: createConvexEditorAiBackend(token),
      admission: createEditorAiAdmission(token),
      runner: createProductionEditorAiRunner(),
    });
    const result = await orchestrator({
      siteId,
      prompt,
      requestId,
      conversationId: body.conversationId,
      abortSignal: request.signal,
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (error instanceof EditorAiConfigurationError) {
      return NextResponse.json(
        { error: error.message, readiness: getEditorAiReadiness() },
        { status: 503 },
      );
    }
    if (error instanceof EditorAiValidationError) {
      return NextResponse.json(
        { error: error.message, diagnostics: error.diagnostics },
        { status: 422 },
      );
    }
    if (request.signal.aborted) {
      return NextResponse.json({ error: "Request cancelled" }, { status: 499 });
    }
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : "Editor AI run failed",
      },
      { status: 500 },
    );
  }
}
