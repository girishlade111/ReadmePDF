#!/usr/bin/env node
/**
 * Fail-closed production build.
 *
 * `npm run build` is the local/static build and is allowed to run without an
 * origin (MODE A). `npm run build:release` is the public-release build:
 *
 *   1. resolve PUBLIC_SITE_URL from the process or `.env.production*`;
 *   2. reject missing, insecure, loopback, reserved, or placeholder origins
 *      before Astro starts;
 *   3. run the normal static Astro build with the validated origin;
 *   4. verify the generated `dist/` tree against the source inventory.
 *
 * There is no skip flag. Any failure exits non-zero so a CI release step
 * cannot publish an SEO-broken artifact. Actual deployment is out of scope.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

import { parseReleaseSiteUrl } from '../src/lib/site.js';
import { ReleaseVerificationError, verifyReleaseArtifacts } from './lib/release-verify.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const distDir = path.join(root, 'dist');
const contentDir = path.join(root, 'src', 'content', 'blog');
const astroBin = path.join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');

function fail(message) {
  console.error(`\n✖ build:release failed\n\n${message}\n`);
  process.exit(1);
}

let site;
try {
  const fileEnv = loadEnv('production', root, '');
  site = parseReleaseSiteUrl(process.env.PUBLIC_SITE_URL ?? fileEnv.PUBLIC_SITE_URL);
} catch (error) {
  fail(
    `${error.message}\n\n` +
      'Set a public HTTPS origin, for example:\n' +
      '  PUBLIC_SITE_URL=https://your-domain.example npm run build:release\n' +
      '(Use a real domain; example/localhost/placeholder hosts are rejected.)',
  );
}

if (!existsSync(astroBin)) {
  fail(`Astro CLI not found at ${astroBin}. Run npm install first.`);
}

console.log(`\n▶ Release build for ${site.origin}\n`);

const build = spawnSync(process.execPath, [astroBin, 'build'], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PUBLIC_SITE_URL: site.origin,
  },
  stdio: 'inherit',
});

if (build.error) {
  fail(`Could not start Astro: ${build.error.message}`);
}
if (build.status !== 0) {
  fail(`Astro build exited with status ${build.status ?? 'unknown'}.`);
}

try {
  const summary = await verifyReleaseArtifacts({
    distDir,
    origin: site.origin,
    contentDir,
  });
  console.log(
    [
      '',
      '✔ build:release passed',
      `  origin:        ${summary.origin}`,
      `  html pages:    ${summary.htmlPages}/${summary.pages}`,
      `  sitemap URLs:  ${summary.sitemapUrls}`,
      `  alternates:    ${summary.alternates}`,
      `  JSON-LD blocks:${String(summary.jsonLdBlocks).padStart(2)}`,
      '',
    ].join('\n'),
  );
} catch (error) {
  if (error instanceof ReleaseVerificationError) {
    fail(
      `Release verification found ${error.failures.length} issue(s):\n` +
        error.failures.map((failure) => `  - ${failure}`).join('\n'),
    );
  }
  fail(`Release verification crashed: ${error.stack ?? error.message}`);
}
