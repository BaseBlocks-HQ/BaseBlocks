import "server-only";

/**
 * Serialize JSON-LD to a safe HTML string for use in script tags.
 * Escapes `<` to prevent XSS via injected `</script>` tags.
 */
function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Renders a `<script type="application/ld+json">` tag with sanitized JSON-LD data.
 * Uses dangerouslySetInnerHTML as recommended by Next.js docs for structured data.
 */
export function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json">{serializeJsonLd(data)}</script>;
}
