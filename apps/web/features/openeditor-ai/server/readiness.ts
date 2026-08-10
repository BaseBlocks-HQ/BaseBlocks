export type EditorAiCredentialReadiness = {
  ready: boolean;
  missing: string[];
  authentication: "vercel-oidc" | "ai-gateway-key" | "none";
  fundingMode: "hosted-funded" | "self-hosted-byok" | "disabled";
};

export function getEditorAiReadiness(
  env: NodeJS.ProcessEnv = process.env,
  requestOidcToken?: string | null,
): EditorAiCredentialReadiness {
  const authentication = env.AI_GATEWAY_API_KEY
    ? ("ai-gateway-key" as const)
    : env.VERCEL_OIDC_TOKEN || requestOidcToken
      ? ("vercel-oidc" as const)
      : ("none" as const);
  const fundingMode =
    env.BASEBLOCKS_AI_FUNDING_MODE === "hosted-funded" ||
    env.BASEBLOCKS_AI_FUNDING_MODE === "self-hosted-byok"
      ? env.BASEBLOCKS_AI_FUNDING_MODE
      : ("disabled" as const);
  const missing = [
    ...(fundingMode === "hosted-funded"
      ? []
      : [
          fundingMode === "self-hosted-byok"
            ? "hosted paid-credit admission is unavailable in self-hosted mode"
            : "BASEBLOCKS_AI_FUNDING_MODE=hosted-funded",
        ]),
    ...(env.EDITOR_AI_MODEL ? [] : ["EDITOR_AI_MODEL"]),
    ...(env.BASEBLOCKS_BILLING_ENVIRONMENT === "sandbox" ||
    env.BASEBLOCKS_BILLING_ENVIRONMENT === "production"
      ? []
      : ["BASEBLOCKS_BILLING_ENVIRONMENT"]),
    ...(authentication === "none" ? ["AI_GATEWAY_API_KEY or Vercel OIDC"] : []),
  ];
  return {
    ready: missing.length === 0,
    missing,
    authentication,
    fundingMode,
  };
}
