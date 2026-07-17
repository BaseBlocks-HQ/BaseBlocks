const firstHeaderValue = (value: string | null) =>
  value?.split(",", 1)[0]?.trim() || null;

function publicRequestOrigin(request: Request): string | null {
  const requestUrl = new URL(request.url);
  const host =
    firstHeaderValue(request.headers.get("x-forwarded-host")) ??
    firstHeaderValue(request.headers.get("host"));
  const protocol =
    firstHeaderValue(request.headers.get("x-forwarded-proto")) ??
    requestUrl.protocol.slice(0, -1);
  if (!host || (protocol !== "http" && protocol !== "https")) return null;

  try {
    const publicUrl = new URL(`${protocol}://${host}`);
    if (
      publicUrl.username ||
      publicUrl.password ||
      publicUrl.pathname !== "/" ||
      publicUrl.search ||
      publicUrl.hash
    ) {
      return null;
    }
    return publicUrl.origin;
  } catch {
    return null;
  }
}

/** Make the URL seen by same-origin guards reflect the browser-facing host. */
export function withPublicRequestOrigin(request: Request): Request {
  const publicOrigin = publicRequestOrigin(request);
  const requestUrl = new URL(request.url);
  if (!publicOrigin || publicOrigin === requestUrl.origin) return request;

  return new Request(
    new URL(`${requestUrl.pathname}${requestUrl.search}`, publicOrigin),
    request,
  );
}
