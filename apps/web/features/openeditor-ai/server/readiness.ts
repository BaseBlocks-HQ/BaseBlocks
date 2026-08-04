export type EditorAiCredentialReadiness = {
  ready: boolean;
  missing: string[];
  authentication: "vercel-oidc" | "ai-gateway-key" | "none";
};

export function getEditorAiReadiness(
  env: NodeJS.ProcessEnv = process.env,
): EditorAiCredentialReadiness {
  const authentication = env.VERCEL_OIDC_TOKEN
    ? ("vercel-oidc" as const)
    : env.AI_GATEWAY_API_KEY
      ? ("ai-gateway-key" as const)
      : ("none" as const);
  const missing = [
    ...(env.EDITOR_AI_MODEL ? [] : ["EDITOR_AI_MODEL"]),
    ...(authentication === "none" ? ["AI_GATEWAY_API_KEY or Vercel OIDC"] : []),
  ];
  return {
    ready: missing.length === 0,
    missing,
    authentication,
  };
}
