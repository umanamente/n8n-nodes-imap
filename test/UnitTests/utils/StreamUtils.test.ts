import { PassThrough } from 'stream';
import { downloadContentToBuffer, streamToBuffer } from '../../../nodes/Imap/utils/StreamUtils';

describe('StreamUtils', () => {
  it('should read a readable stream into a buffer', async () => {
    const stream = new PassThrough();
    const expected = Buffer.from('stream payload');

    setImmediate(() => {
      stream.write(expected);
      stream.end();
    });

    await expect(streamToBuffer(stream)).resolves.toEqual(expected);
  });

  it('should return buffers unchanged', async () => {
    const buffer = Buffer.from('already a buffer');
    await expect(downloadContentToBuffer(buffer)).resolves.toBe(buffer);
  });

  it('should drain readable streams through downloadContentToBuffer', async () => {
    const stream = new PassThrough();
    const expected = Buffer.from('download payload');

    setImmediate(() => {
      stream.write(expected);
      stream.end();
    });

    await expect(downloadContentToBuffer(stream)).resolves.toEqual(expected);
  });
});
