import { Readable } from 'stream';

/**
 * Reads all data from a readable stream into a single Buffer.
 * Ensures the stream is fully consumed before returning.
 */
export function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    stream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    stream.on('error', reject);
  });
}

/**
 * Normalizes ImapFlow download content to a Buffer.
 * Accepts either a Buffer (already materialized) or a Readable stream.
 */
export async function downloadContentToBuffer(content: Readable | Buffer): Promise<Buffer> {
  if (Buffer.isBuffer(content)) {
    return content;
  }
  return streamToBuffer(content);
}
