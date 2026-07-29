export type FileAccessScope = "member" | "public";

export function fileCacheControl(
  access: FileAccessScope,
  contentType: string,
): string {
  return access === "public" && contentType.startsWith("image/")
    ? "public, max-age=300, stale-while-revalidate=3600"
    : "private, no-store";
}
