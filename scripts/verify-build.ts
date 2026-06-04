/**
 * Pre-build verification script.
 * Checks critical security and stealth properties before packaging.
 *
 * Usage: npx ts-node scripts/verify-build.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
let errors = 0;

function check(label: string, pass: boolean): void {
  if (pass) {
    console.log(`  [PASS] ${label}`);
  } else {
    console.error(`  [FAIL] ${label}`);
    errors++;
  }
}

function readFile(relativePath: string): string {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`  [FAIL] File not found: ${relativePath}`);
    errors++;
    return '';
  }
  return fs.readFileSync(fullPath, 'utf-8');
}

console.log('\n=== InvisiQ Build Verification ===\n');

// 1. Overlay stealth
console.log('1. Overlay stealth checks:');
const overlay = readFile('src/main/overlay.ts');
check('setContentProtection(true) exists in overlay.ts', overlay.includes('setContentProtection(true)'));
check('contextIsolation: true in overlay.ts', overlay.includes('contextIsolation: true'));
check('nodeIntegration: false in overlay.ts', overlay.includes('nodeIntegration: false'));

// 2. Region selector stealth
console.log('\n2. Region selector checks:');
const regionSelector = readFile('src/main/region-selector.ts');
check('setContentProtection(true) in region-selector.ts', regionSelector.includes('setContentProtection(true)'));

// 3. Electron builder config
console.log('\n3. Build config checks:');
const builderConfig = readFile('electron-builder.yml');
check('productName is "Runtime Broker" (disguise)', builderConfig.includes('productName: Runtime Broker'));
check('deleteAppDataOnUninstall: true', builderConfig.includes('deleteAppDataOnUninstall: true'));
check('helper packed via extraResources', builderConfig.includes('ghostai_helper.exe'));

// 4. No hardcoded dev paths in main process files
console.log('\n4. No hardcoded dev paths:');
const mainFiles = [
  'src/main/index.ts',
  'src/main/overlay.ts',
  'src/main/ipc-handlers.ts',
  'src/main/store.ts',
];
for (const file of mainFiles) {
  const content = readFile(file);
  const hasHardcodedPath = /[A-Z]:\\Users\\/.test(content) || /\/home\/\w+\//.test(content);
  check(`No hardcoded user paths in ${file}`, !hasHardcodedPath);
}

// 5. Preload security
console.log('\n5. Preload security:');
const preload = readFile('src/preload/index.ts');
check('contextBridge usage in preload', preload.includes('contextBridge'));
check('exposeInMainWorld in preload', preload.includes('exposeInMainWorld'));

// 6. Stealth-capture helper (Model B)
console.log('\n6. Stealth-capture helper:');
const helperExe = path.join(ROOT, 'native', 'ghostai-helper', 'dist', 'ghostai_helper.exe');
check('helper binary built (run npm run build:helper)', fs.existsSync(helperExe));

const helperSrc = readFile('native/ghostai-helper/src/main.cpp');
// Security invariants: a keyboard-hooking binary must NOT touch network or disk.
// Network: cover Winsock + WinHTTP/WinINet + name resolution.
const hasNetwork =
  /\b(WSAStartup|WSASend|WSARecv|socket\s*\(|connect\s*\(|getaddrinfo|InternetOpen|WinHttp\w+|URLDownload)/.test(
    helperSrc,
  );
check('helper has NO network code', !hasNetwork);
// Disk: cover the CRT and Win32 file-open primitives. The helper legitimately
// uses CreateNamedPipeW + WriteFile on the PIPE handle, so we ban CreateFile*
// (file open) and the CRT file APIs rather than WriteFile itself.
const hasFileWrite =
  /\b(fopen|_wfopen|_open|_wopen|ofstream|std::ofstream|CreateFileA|CreateFileW|CreateFile2|RegSetValue\w*)\b/.test(
    helperSrc,
  );
check('helper has NO disk-write code', !hasFileWrite);
check('helper uses ToUnicodeEx non-destructive flag (0x4)', helperSrc.includes(', 0x4,'));
check('helper hardens pipe (PIPE_REJECT_REMOTE_CLIENTS)', helperSrc.includes('PIPE_REJECT_REMOTE_CLIENTS'));
check('helper has parent-death watchdog', helperSrc.includes('watchdogThreadMain'));

// Summary
console.log(`\n=== Results: ${errors === 0 ? 'ALL PASSED' : `${errors} FAILURE(S)`} ===\n`);

if (errors > 0) {
  process.exit(1);
}
