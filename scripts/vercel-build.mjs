#!/usr/bin/env node
/**
 * md2pdf — Vercel Environment-Aware Build Entrypoint
 *
 * Directs build execution based on Vercel environment:
 * - Production (VERCEL_ENV === 'production'): Executes strict `npm run build:release`
 *   with fail-closed validation of PUBLIC_SITE_URL.
 * - Preview (VERCEL_ENV === 'preview'): Executes standard static `npm run build`
 *   without requiring the final production domain.
 * - Local / Default: Executes `build:release` if PUBLIC_SITE_URL is configured,
 *   otherwise standard `npm run build`.
 */
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const vercelEnv = process.env.VERCEL_ENV;
const siteUrl = process.env.PUBLIC_SITE_URL;

console.log('------------------------------------------------------------');
console.log('MD2PDF VERCEL BUILD DISPATCHER');
console.log(`VERCEL_ENV:       ${vercelEnv || '(not set - local/custom CI)'}`);
console.log(`PUBLIC_SITE_URL:  ${siteUrl || '(not configured)'}`);
console.log('------------------------------------------------------------');

let command = 'npm';
let args = ['run', 'build'];

if (vercelEnv === 'production') {
  if (!siteUrl || !/^https:\/\/[^/]+/i.test(siteUrl)) {
    console.error(
      '\n✖ FATAL: Vercel Production deployment requires a valid HTTPS PUBLIC_SITE_URL.\n' +
        'Configured value: ' +
        JSON.stringify(siteUrl) +
        '\n' +
        'Add the variable using Vercel CLI: vercel env add PUBLIC_SITE_URL production\n',
    );
    process.exit(1);
  }

  console.log('▶ Target: Production Environment. Executing strict release gate (npm run build:release)...');
  args = ['run', 'build:release'];
} else if (vercelEnv === 'preview') {
  console.log('▶ Target: Preview Environment. Executing standard static build (npm run build)...');
  args = ['run', 'build'];
} else {
  // Local or unspecified CI environment
  if (siteUrl && /^https:\/\/[^/]+/i.test(siteUrl)) {
    console.log('▶ Target: Local/CI with production URL. Executing npm run build:release...');
    args = ['run', 'build:release'];
  } else {
    console.log('▶ Target: Local development build. Executing npm run build...');
    args = ['run', 'build'];
  }
}

const isWindows = process.platform === 'win32';
const npmExecutable = isWindows ? 'npm.cmd' : 'npm';

const result = spawnSync(npmExecutable, args, {
  stdio: 'inherit',
  shell: isWindows,
  env: process.env,
});

if (result.error) {
  console.error('\n✖ Build dispatch failed to start child process:', result.error);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(`\n✖ Build command exited with non-zero exit code: ${result.status}`);
  process.exit(result.status ?? 1);
}

console.log('\n✔ Vercel build dispatcher completed successfully.');
process.exit(0);
