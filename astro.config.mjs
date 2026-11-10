// @ts-check
import { defineConfig } from 'astro/config';

// The whole site is prerendered to static files in dist/ and served by
// Cloudflare Workers Static Assets (see wrangler.jsonc). Nothing here needs
// a server at runtime.
export default defineConfig({
  site: 'https://animaengine.eu',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // Keep every stylesheet in a hashed file so the Content-Security-Policy
    // can stay at style-src 'self' with no inline styles.
    inlineStylesheets: 'never',
  },
  compressHTML: true,
  devToolbar: { enabled: false },
  prefetch: false,
  markdown: {
    // Prism marks tokens with classes; Shiki would write inline style
    // attributes, which the CSP does not allow.
    syntaxHighlight: 'prism',
  },
  vite: {
    build: {
      // Never inline scripts or assets as data: URIs; every file gets a
      // hashed URL under /_astro/ that can be cached as immutable.
      assetsInlineLimit: 0,
    },
  },
});
