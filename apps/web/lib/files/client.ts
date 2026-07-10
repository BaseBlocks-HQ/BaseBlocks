"use client";

export async function deleteDocument(documentId: string): Promise<void> {
  const response = await fetch(`/api/storage/documents/${documentId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error || `Delete failed (${response.status})`);
  }
}
