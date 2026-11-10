/**
 * The site's only runtime code, and it runs for video files alone
 * (wrangler.jsonc → assets.run_worker_first). Everything else is served
 * straight from static assets without invoking this Worker.
 *
 * Why it exists: Workers Static Assets answers a `Range` request with the
 * whole file and status 200. Safari and every browser on iOS need
 * `206 Partial Content` before they will play a <video>, so without this the
 * product clips would not play there. It fetches the file from the ASSETS
 * binding and returns the requested byte range.
 */
import { applyRange } from './range';

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Ask the asset layer for the whole file (GET, also for HEAD, so the size
    // is known); the slice is made here.
    const plain = new Request(request.url, { method: 'GET', headers: request.headers });
    plain.headers.delete('Range');
    const response = await env.ASSETS.fetch(plain);
    return applyRange(response, request.headers.get('Range'), request.method);
  },
};
