export function optimizedImageUrl(source: string, width: number, quality = 75) {
  return `/_next/image?url=${encodeURIComponent(source)}&w=${width}&q=${quality}`;
}

export function optimizedImageSrcSet(
  source: string,
  widths: number[],
  quality = 75,
) {
  return widths
    .map((width) => `${optimizedImageUrl(source, width, quality)} ${width}w`)
    .join(", ");
}
