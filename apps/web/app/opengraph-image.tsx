import {
  baseBlocksOgAlt,
  baseBlocksOgContentType,
  baseBlocksOgSize,
  createBaseBlocksOpenGraphImage,
} from "@/modules/og/opengraph-image";

export const alt = baseBlocksOgAlt;
export const size = baseBlocksOgSize;
export const contentType = baseBlocksOgContentType;

export default function OpenGraphImage() {
  return createBaseBlocksOpenGraphImage();
}
