import { Readable } from "node:stream";

// Failure modes:
// - Passing a live request stream through the AWS SDK can fail if the runtime
//   starts flowing the stream before the SDK hashes it for signing.
// - Non-byte chunks would corrupt the uploaded object contents.
export async function toPutObjectBody(
  body: ReadableStream<Uint8Array> | Uint8Array | Readable,
): Promise<Uint8Array> {
  if (body instanceof Uint8Array) {
    return body;
  }

  if (body instanceof Readable) {
    const chunks: Uint8Array[] = [];
    for await (const chunk of body) {
      if (chunk instanceof Uint8Array) {
        chunks.push(chunk);
        continue;
      }

      chunks.push(new Uint8Array(chunk));
    }

    const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  }

  const bytes = await new Response(body).arrayBuffer();
  return new Uint8Array(bytes);
}
