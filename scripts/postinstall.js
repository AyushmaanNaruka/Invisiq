#!/usr/bin/env node
/**
 * postinstall — runs electron-builder install-app-deps to rebuild native modules
 * against Electron's ABI. Tolerates failure for N-API modules that ship prebuilts.
 *
 * Why this wrapper exists:
 *   Our only native dep, uiohook-napi, uses N-API and ships ABI-stable prebuilt
 *   binaries (via prebuildify → node-gyp-build). Forcing a from-source rebuild
 *   requires Visual Studio C++ Build Tools — a 6GB+ install most users don't
 *   need. If the rebuild fails (no MSVC toolchain) but the prebuilt binary is
 *   present on disk, we keep the install green and emit a clear notice.
 *
 *   If you add a native dep that does NOT ship prebuilts for the user's
 *   platform/Electron ABI, the prebuilt-binary check below will fail and the
 *   install will report a real error.
 */

const { execSync } = require('child_process');
const { existsSync } = require('fs');
const { join } = require('path');

function log(msg) {
  console.log(`[postinstall] ${msg}`);
}

function detectPrebuildPath() {
  const arch = process.arch; // 'x64', 'arm64', etc.
  const platform = process.platform; // 'win32', 'darwin', 'linux'
  return join(
    __dirname,
    '..',
    'node_modules',
    'uiohook-napi',
    'prebuilds',
    `${platform}-${arch}`,
    'uiohook-napi.node',
  );
}

try {
  execSync('electron-builder install-app-deps', { stdio: 'inherit' });
} catch (err) {
  const prebuildPath = detectPrebuildPath();
  if (existsSync(prebuildPath)) {
    log('');
    log('Native rebuild failed (no MSVC C++ toolchain detected), but the');
    log(`prebuilt N-API binary is present at:`);
    log(`  ${prebuildPath}`);
    log('');
    log('uiohook-napi is N-API and ABI-stable across Electron versions, so');
    log('the prebuilt binary will be used at runtime. Install continues.');
    log('');
    process.exit(0);
  }

  log('');
  log('Native rebuild failed AND no prebuilt binary found for your platform.');
  log('Install Visual Studio Build Tools 2022 with the "Desktop development');
  log('with C++" workload, then run npm install again.');
  log('');
  process.exit(1);
}
