/**
 * test-helper.js — runtime integration test for ghostai_helper.exe.
 *
 * Spawns the helper, connects to its named pipe, and exercises the protocol:
 * handshake → ping/pong → set_capture (hook install) → status → graceful
 * shutdown, plus the parent-death watchdog. Windows-only.
 *
 * Run: node scripts/test-helper.js
 */
'use strict';
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const fs = require('node:fs');

const HELPER = path.join(__dirname, '..', 'native', 'ghostai-helper', 'dist', 'ghostai_helper.exe');
const results = [];
function ok(label, pass) { results.push({ label, pass }); console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}`); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connectPipe(pipeName, tries = 20) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      const sock = net.connect(`\\\\.\\pipe\\${pipeName}`);
      sock.once('connect', () => resolve(sock));
      sock.once('error', () => {
        if (n <= 0) return reject(new Error('pipe connect failed'));
        setTimeout(() => attempt(n - 1), 150);
      });
    };
    attempt(tries);
  });
}

async function main() {
  if (!fs.existsSync(HELPER)) {
    console.error(`Helper not found at ${HELPER} — run "npm run build:helper" first.`);
    process.exit(1);
  }

  // ── Test 1: protocol ──────────────────────────────────────────────
  const pipeName = `InvisiQTest-${process.pid}`;
  const helper = spawn(HELPER, [pipeName, String(process.pid)], { stdio: ['ignore', 'pipe', 'pipe'] });

  let sawReadyStdout = false;
  helper.stdout.on('data', (b) => { if (b.toString().includes('READY')) sawReadyStdout = true; });
  helper.stderr.on('data', () => { /* metadata only; ignore */ });

  let exited = false;
  helper.on('exit', () => { exited = true; });

  const sock = await connectPipe(pipeName);
  const msgs = [];
  let buf = '';
  sock.on('data', (d) => {
    buf += d.toString('utf8');
    let nl;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) { try { msgs.push(JSON.parse(line)); } catch { /* ignore */ } }
    }
  });
  const waitFor = async (type, ms = 3000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const m = msgs.find((x) => x.type === type);
      if (m) return m;
      await sleep(50);
    }
    return null;
  };
  const send = (obj) => sock.write(JSON.stringify(obj) + '\n');

  await sleep(300);
  ok('helper emits READY on stdout', sawReadyStdout);
  ok('pipe sends {ready} after connect', !!(await waitFor('ready')));

  send({ type: 'ping' });
  ok('ping → pong', !!(await waitFor('pong')));

  send({ type: 'set_capture', payload: { active: true, epoch: 1 } });
  ok('set_capture(active) → ack (hook installed)', !!(await waitFor('ack')));

  msgs.length = 0;
  send({ type: 'get_status' });
  const status = await waitFor('status');
  ok('get_status → status{capturing:true}', !!(status && status.payload && status.payload.capturing === true));

  send({ type: 'set_capture', payload: { active: false, epoch: 1 } });
  await sleep(200);
  msgs.length = 0;
  send({ type: 'get_status' });
  const status2 = await waitFor('status');
  ok('set_capture(false) → status{capturing:false}', !!(status2 && status2.payload && status2.payload.capturing === false));

  send({ type: 'shutdown' });
  const end = Date.now() + 3000;
  while (Date.now() < end && !exited) await sleep(50);
  ok('shutdown → helper process exits cleanly', exited);
  try { sock.destroy(); } catch { /* noop */ }

  // ── Test 2: parent-death watchdog ─────────────────────────────────
  // Spawn a throwaway "parent", point a helper at it, then kill the parent and
  // assert the helper self-terminates (so a crashed main never orphans the hook).
  const dummy = spawn(process.execPath, ['-e', 'setTimeout(()=>{}, 60000)']);
  const wdPipe = `InvisiQWatchdog-${process.pid}`;
  const helper2 = spawn(HELPER, [wdPipe, String(dummy.pid)], { stdio: ['ignore', 'pipe', 'pipe'] });
  let helper2Exited = false;
  helper2.on('exit', () => { helper2Exited = true; });
  await sleep(800); // let it come up
  dummy.kill(); // simulate parent (main process) death
  const wdEnd = Date.now() + 4000;
  while (Date.now() < wdEnd && !helper2Exited) await sleep(50);
  ok('watchdog: helper self-exits when parent dies', helper2Exited);
  if (!helper2Exited) { try { helper2.kill(); } catch { /* noop */ } }

  // ── Summary ───────────────────────────────────────────────────────
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n=== Helper runtime test: ${failed === 0 ? 'ALL PASSED' : failed + ' FAILED'} ===`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error('test-helper error:', e); process.exit(1); });
