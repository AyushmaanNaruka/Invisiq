/**
 * Pre-build verification script.
 * Checks critical security and stealth properties before packaging.
 *
 * Usage: npx ts-node scripts/verify-build.ts
 */

import fs from 'fs';
import path from 'path';

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

console.log('\n=== GhostAI Build Verification ===\n');

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
check('productName is "SystemHelper"', builderConfig.includes('productName: SystemHelper'));
check('deleteAppDataOnUninstall: true', builderConfig.includes('deleteAppDataOnUninstall: true'));

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

// Summary
console.log(`\n=== Results: ${errors === 0 ? 'ALL PASSED' : `${errors} FAILURE(S)`} ===\n`);

if (errors > 0) {
  process.exit(1);
}
