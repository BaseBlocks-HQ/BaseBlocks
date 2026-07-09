function extractAuthErrorMessage(error: unknown): string | null {
  if (typeof error === "string" && error.length > 0) {
    return error;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.length > 0
  ) {
    return error.message;
  }

  return null;
}

export function getAuthClientDataOrThrow<T>(
  result: unknown,
  fallbackMessage: string,
): T {
  if (!result || typeof result !== "object") {
    throw new Error(fallbackMessage);
  }

  const authResult = result as {
    data?: T | null;
    error?: unknown;
  };

  const errorMessage = extractAuthErrorMessage(authResult.error);
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  if (authResult.data == null) {
    throw new Error(fallbackMessage);
  }

  return authResult.data;
}
