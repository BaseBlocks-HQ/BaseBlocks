import type { OpenEditorCustomBlockViewerHost } from "@openeditor/custom-block/viewer";

/** Keeps stale or unauthorized managed-asset results out of rendered links. */
export class QuickLinkAssetLoader {
  private generation = 0;

  cancel() {
    this.generation += 1;
  }

  load(
    assetId: string | null,
    host: Pick<OpenEditorCustomBlockViewerHost, "assets" | "resolveUrl">,
    update: (asset: { src: string; alt: string } | null) => void,
  ) {
    const generation = ++this.generation;
    update(null);
    if (!assetId) return;
    void host.assets
      ?.resolve(assetId)
      .then((resolved) => {
        if (generation !== this.generation) return;
        const src = resolved ? host.resolveUrl(resolved.src, "asset") : null;
        update(resolved && src ? { ...resolved, src } : null);
      })
      .catch(() => {
        if (generation === this.generation) update(null);
      });
  }
}
