/**
 * HTTP byte-range handling (RFC 9110 §14) for one range per request — what
 * browsers send for <video>. Pure functions, unit-tested in tests/range.test.ts.
 */

export type RangeResult =
  /** Serve bytes [start, end] inclusive. */
  | { kind: 'partial'; start: number; end: number }
  /** No usable Range header (absent, malformed, several ranges): send it all. */
  | { kind: 'full' }
  /** The range starts beyond the end of the file. */
  | { kind: 'unsatisfiable' };

export function parseRange(header: string | null, size: number): RangeResult {
  if (!header) return { kind: 'full' };
  const match = /^\s*bytes\s*=\s*(\d*)\s*-\s*(\d*)\s*$/i.exec(header);
  // Multiple ranges ("0-1, 5-9") are allowed to be answered with the whole file.
  if (!match) return { kind: 'full' };
  const [, rawStart = '', rawEnd = ''] = match;
  if (rawStart === '' && rawEnd === '') return { kind: 'full' };

  if (rawStart === '') {
    // Suffix range: the last N bytes.
    const suffix = Number(rawEnd);
    if (suffix === 0) return { kind: 'unsatisfiable' };
    return { kind: 'partial', start: Math.max(0, size - suffix), end: size - 1 };
  }

  const start = Number(rawStart);
  const end = rawEnd === '' ? size - 1 : Math.min(Number(rawEnd), size - 1);
  if (start >= size) return { kind: 'unsatisfiable' };
  if (end < start) return { kind: 'full' };
  return { kind: 'partial', start, end };
}

/**
 * Turns a full 200 response into the answer to `rangeHeader`. The body is
 * read into memory, which is fine for the site's clips (well under 1 MB).
 */
export async function applyRange(response: Response, rangeHeader: string | null, method: string): Promise<Response> {
  const headers = new Headers(response.headers);
  headers.set('Accept-Ranges', 'bytes');
  if (response.status !== 200 || !rangeHeader || (method !== 'GET' && method !== 'HEAD')) {
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  const body = await response.arrayBuffer();
  const size = body.byteLength;
  const range = parseRange(rangeHeader, size);

  if (range.kind === 'unsatisfiable') {
    headers.set('Content-Range', `bytes */${size}`);
    headers.delete('Content-Length');
    return new Response(null, { status: 416, headers });
  }
  if (range.kind === 'full') {
    headers.set('Content-Length', String(size));
    return new Response(method === 'HEAD' ? null : body, { status: 200, headers });
  }

  const slice = body.slice(range.start, range.end + 1);
  headers.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
  headers.set('Content-Length', String(slice.byteLength));
  return new Response(method === 'HEAD' ? null : slice, { status: 206, headers });
}
