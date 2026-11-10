import { describe, expect, it } from 'vitest';
import { applyRange, parseRange } from '../worker/range';

describe('parseRange', () => {
  it('reads the ranges browsers send for video', () => {
    expect(parseRange('bytes=0-1', 1000)).toEqual({ kind: 'partial', start: 0, end: 1 });
    expect(parseRange('bytes=100-', 1000)).toEqual({ kind: 'partial', start: 100, end: 999 });
    expect(parseRange('bytes=-200', 1000)).toEqual({ kind: 'partial', start: 800, end: 999 });
    expect(parseRange('bytes=500-5000', 1000)).toEqual({ kind: 'partial', start: 500, end: 999 });
  });

  it('answers with the whole file when the header is absent or unusable', () => {
    expect(parseRange(null, 1000)).toEqual({ kind: 'full' });
    expect(parseRange('bytes=0-1, 5-9', 1000)).toEqual({ kind: 'full' });
    expect(parseRange('items=0-1', 1000)).toEqual({ kind: 'full' });
    expect(parseRange('bytes=-', 1000)).toEqual({ kind: 'full' });
    expect(parseRange('bytes=9-3', 1000)).toEqual({ kind: 'full' });
  });

  it('rejects ranges past the end of the file', () => {
    expect(parseRange('bytes=1000-', 1000)).toEqual({ kind: 'unsatisfiable' });
    expect(parseRange('bytes=-0', 1000)).toEqual({ kind: 'unsatisfiable' });
  });
});

describe('applyRange', () => {
  const file = () =>
    new Response(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), {
      status: 200,
      headers: { 'Content-Type': 'video/mp4', 'Cache-Control': 'public, max-age=31536000, immutable' },
    });

  it('returns 206 with the requested bytes and keeps the other headers', async () => {
    const res = await applyRange(file(), 'bytes=2-4', 'GET');
    expect(res.status).toBe(206);
    expect(res.headers.get('Content-Range')).toBe('bytes 2-4/10');
    expect(res.headers.get('Content-Length')).toBe('3');
    expect(res.headers.get('Accept-Ranges')).toBe('bytes');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    expect([...new Uint8Array(await res.arrayBuffer())]).toEqual([2, 3, 4]);
  });

  it('returns 416 for an unsatisfiable range', async () => {
    const res = await applyRange(file(), 'bytes=50-', 'GET');
    expect(res.status).toBe(416);
    expect(res.headers.get('Content-Range')).toBe('bytes */10');
  });

  it('passes whole-file and error responses through, advertising range support', async () => {
    const whole = await applyRange(file(), null, 'GET');
    expect(whole.status).toBe(200);
    expect(whole.headers.get('Accept-Ranges')).toBe('bytes');
    expect((await whole.arrayBuffer()).byteLength).toBe(10);

    const missing = await applyRange(new Response('Not found', { status: 404 }), 'bytes=0-1', 'GET');
    expect(missing.status).toBe(404);
  });

  it('sends no body for HEAD', async () => {
    const res = await applyRange(file(), 'bytes=0-1', 'HEAD');
    expect(res.status).toBe(206);
    expect(res.body).toBeNull();
  });
});
