/**
 * build-helper.js — compile the native stealth-capture helper (ghostai_helper.exe).
 *
 * Prefers MSVC via CMake (production toolchain — best AV/EDR posture, signable).
 * Falls back to MinGW g++ for dev machines without Visual Studio. The final
 * binary is copied to native/ghostai-helper/dist/ghostai_helper.exe, which is
 * what electron-builder packs via extraResources (toolchain-independent path).
 *
 * Run: npm run build:helper
 */
'use strict';

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'native', 'ghostai-helper');
const srcCpp = path.join(root, 'src', 'main.cpp');
const buildDir = path.join(root, 'build');
const distDir = path.join(root, 'dist');
const distExe = path.join(distDir, 'ghostai_helper.exe');

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', ...opts });
}

function tryMsvc() {
  try {
    execSync('cmake --version', { stdio: 'ignore' });
  } catch {
    console.log('[build:helper] CMake not found — skipping MSVC path.');
    return null;
  }
  try {
    // Clear any stale CMake cache (e.g. from a prior g++-only run) so the
    // VS generator + platform selection doesn't hit a generator-mismatch error.
    const cache = path.join(buildDir, 'CMakeCache.txt');
    if (fs.existsSync(cache)) fs.rmSync(cache, { force: true });
    console.log('[build:helper] Configuring with CMake (MSVC, x64)…');
    run('cmake -S . -B build -A x64', { cwd: root });
    run('cmake --build build --config Release', { cwd: root });
    const exe = path.join(buildDir, 'Release', 'ghostai_helper.exe');
    if (fs.existsSync(exe)) return exe;
  } catch (err) {
    console.warn('[build:helper] MSVC/CMake build failed — falling back to g++:', err.message);
  }
  return null;
}

function tryGpp() {
  try {
    execSync('g++ --version', { stdio: 'ignore' });
  } catch {
    return null;
  }
  console.log('[build:helper] Building with MinGW g++ (dev fallback)…');
  fs.mkdirSync(buildDir, { recursive: true });
  const out = path.join(buildDir, 'ghostai_helper.exe');
  run(
    `g++ -std=c++17 -municode -O2 "${srcCpp}" -o "${out}" ` +
      '-luser32 -ladvapi32 -lwtsapi32 -lnormaliz -mwindows',
  );
  return fs.existsSync(out) ? out : null;
}

function main() {
  if (process.platform !== 'win32') {
    console.error('[build:helper] The stealth-capture helper is Windows-only.');
    process.exit(1);
  }

  const built = tryMsvc() || tryGpp();
  if (!built) {
    console.error(
      '[build:helper] FAILED — no compiler produced a binary. Install Visual Studio ' +
        'Build Tools (C++ workload) or MinGW g++.',
    );
    process.exit(1);
  }

  fs.mkdirSync(distDir, { recursive: true });
  fs.copyFileSync(built, distExe);
  const kb = (fs.statSync(distExe).size / 1024).toFixed(0);
  console.log(`[build:helper] OK → ${distExe} (${kb} KB)`);
}

main();
