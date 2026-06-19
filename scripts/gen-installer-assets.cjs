/**
 * Generates the branded NSIS installer graphics for InvisiQ:
 *   build/installerSidebar.bmp  (164x314, 24-bit)  — welcome + finish pages
 *   build/installerHeader.bmp   (150x57,  24-bit)  — inner-page header band
 *
 * Why this approach: the repo has no `sharp`/`canvas`/SVG rasterizer, but it
 * DOES ship Electron. We render an HTML template offscreen, capture the page to
 * a NativeImage, resize to the exact NSIS dimensions, then hand-encode a 24-bit
 * BMP (the only format NSIS accepts for these images). Zero new dependencies.
 *
 * Run:  npm run gen:installer-assets   (→ npx electron scripts/gen-installer-assets.cjs)
 *
 * The BMP outputs are committed so a normal `npm run package` doesn't need
 * Electron-render at build time. Re-run this only when the brand art changes.
 */
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

// Output into the electron-builder buildResources dir (assets/). Files named
// installerSidebar.bmp / installerHeader.bmp / license.txt there are
// auto-detected by electron-builder — no explicit path config needed — and,
// unlike build/, assets/ is tracked in git so packaging works on a clean clone.
const OUT_DIR = path.join(__dirname, '..', 'assets');

// Disable GPU so offscreen rendering works in headless / CI / sandbox contexts.
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

/** The InvisiQ ghost mark as inline SVG (matches src/.../ui/InvisiQLogo.tsx). */
function markSvg(size) {
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="15" fill="#0c0c12"/>
      <rect x="0.5" y="0.5" width="63" height="63" rx="14.5" stroke="#ffffff" stroke-opacity="0.12"/>
      <g transform="translate(8 7) scale(2)">
        <path d="M4 11a8 8 0 0 1 16 0v9l-2.5-1.5L15 20l-3-1.5L9 20l-2.5-1.5L4 20z" fill="#2ee5c5"/>
        <circle cx="9.5" cy="11" r="1.5" fill="#0c0c12"/>
        <circle cx="14.5" cy="11" r="1.5" fill="#0c0c12"/>
      </g>
    </svg>`;
}

const FONT = `'Segoe UI', 'Inter', system-ui, sans-serif`;

/** 164x314 sidebar — deep-navy gradient + teal glow, centered brand, tagline. */
function sidebarHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:164px;height:314px;overflow:hidden}
    .panel{
      width:164px;height:314px;position:relative;
      background:
        radial-gradient(120px 120px at 50% 30%, rgba(20,184,166,.28) 0%, transparent 70%),
        radial-gradient(160px 160px at 90% 100%, rgba(139,92,246,.20) 0%, transparent 70%),
        linear-gradient(165deg,#0c1320 0%,#070a11 100%);
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:${FONT};color:#e2e8f0;
    }
    .grid{position:absolute;inset:0;opacity:.5;
      background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),
        linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);
      background-size:22px 22px;
      -webkit-mask-image:radial-gradient(circle at 50% 35%,#000 0%,transparent 78%);}
    .mark{filter:drop-shadow(0 0 18px rgba(20,184,166,.45));border-radius:14px}
    .name{margin-top:16px;font-size:21px;font-weight:700;letter-spacing:-.4px;color:#f4f4f6}
    .tag{margin-top:8px;padding:0 22px;text-align:center;font-size:10px;line-height:1.5;color:#7c8aa0}
    .rule{margin-top:16px;width:40px;height:2px;border-radius:2px;
      background:linear-gradient(90deg,transparent,#14b8a6,transparent)}
    .foot{position:absolute;bottom:14px;font-size:9px;letter-spacing:.12em;
      text-transform:uppercase;color:#4b5a70}
  </style></head><body>
    <div class="panel">
      <div class="grid"></div>
      <div class="mark">${markSvg(72)}</div>
      <div class="name">InvisiQ</div>
      <div class="tag">Sees everything.<br>Seen by no one.</div>
      <div class="rule"></div>
      <div class="foot">Private Beta</div>
    </div>
  </body></html>`;
}

/** 150x57 header — white band (matches MUI header strip) + dark brand, teal dot. */
function headerHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:150px;height:57px;overflow:hidden}
    .bar{width:150px;height:57px;background:#ffffff;display:flex;align-items:center;
      gap:8px;padding:0 12px;font-family:${FONT}}
    .name{font-size:15px;font-weight:700;letter-spacing:-.3px;color:#0c1320}
    .dot{width:6px;height:6px;border-radius:50%;background:#14b8a6;
      box-shadow:0 0 6px rgba(20,184,166,.6)}
  </style></head><body>
    <div class="bar">
      ${markSvg(30)}
      <span class="name">InvisiQ</span>
      <span class="dot" style="margin-left:auto"></span>
    </div>
  </body></html>`;
}

async function renderToBitmap(html, width, height, tmpName) {
  const win = new BrowserWindow({
    width,
    height,
    show: false,
    frame: false,
    webPreferences: { offscreen: true, sandbox: false },
  });
  win.webContents.setFrameRate(5);
  // loadFile is far more reliable than a long data: URL in offscreen mode.
  const tmpFile = path.join(OUT_DIR, tmpName);
  fs.writeFileSync(tmpFile, html);
  await win.loadFile(tmpFile);
  // Give layout + the offscreen compositor a couple frames to settle.
  await new Promise((r) => setTimeout(r, 400));
  let image = await win.webContents.capturePage();
  // Force exact pixel dimensions (capturePage may return at device scale).
  const size = image.getSize();
  if (size.width !== width || size.height !== height) {
    image = image.resize({ width, height, quality: 'best' });
  }
  const bgra = image.toBitmap(); // BGRA, top-down
  const png = image.toPNG(); // for human preview / verification only
  win.destroy();
  try {
    fs.unlinkSync(tmpFile);
  } catch {
    /* ignore */
  }
  return { bgra, png };
}

/** Encode top-down BGRA -> 24-bit bottom-up BMP buffer. */
function encodeBmp24(bgra, width, height) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const buf = Buffer.alloc(fileSize);
  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(54, 10); // pixel data offset
  buf.writeUInt32LE(40, 14); // DIB header size
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22); // positive => bottom-up
  buf.writeUInt16LE(1, 26); // planes
  buf.writeUInt16LE(24, 28); // bpp
  buf.writeUInt32LE(0, 30); // BI_RGB
  buf.writeUInt32LE(pixelArraySize, 34);
  buf.writeInt32LE(2835, 38); // 72 DPI
  buf.writeInt32LE(2835, 42);
  for (let y = 0; y < height; y++) {
    const srcRow = y * width * 4;
    const dstRow = 54 + (height - 1 - y) * rowSize;
    for (let x = 0; x < width; x++) {
      const s = srcRow + x * 4;
      const d = dstRow + x * 3;
      buf[d] = bgra[s]; // B
      buf[d + 1] = bgra[s + 1]; // G
      buf[d + 2] = bgra[s + 2]; // R
    }
  }
  return buf;
}

async function build(name, html, width, height) {
  const { bgra, png } = await renderToBitmap(html, width, height, '.' + name + '.tmp.html');
  const bmp = encodeBmp24(bgra, width, height);
  const out = path.join(OUT_DIR, name);
  fs.writeFileSync(out, bmp);
  // PNG preview (gitignored) — lets a human eyeball the exact rendered art,
  // since NSIS reads the BMP and most viewers can't read our 24-bit BMP back.
  if (process.argv.includes('--preview')) {
    fs.writeFileSync(path.join(OUT_DIR, '_preview_' + name.replace(/\.bmp$/, '.png')), png);
  }
  console.log(`  ✓ ${name}  (${width}x${height}, ${bmp.length} bytes)`);
}

// Offscreen rendering reliably succeeds only for the FIRST window in a process
// (a second offscreen capture after disabling the GPU tends to ERR_FAILED). So
// we render exactly one asset per invocation and let the npm script call us
// once per target.
const TARGETS = {
  sidebar: () => build('installerSidebar.bmp', sidebarHtml(), 164, 314),
  header: () => build('installerHeader.bmp', headerHtml(), 150, 57),
};

app.whenReady().then(async () => {
  const target = process.argv.find((a) => a === 'sidebar' || a === 'header');
  try {
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
    const jobs = target ? [target] : Object.keys(TARGETS);
    console.log(`Generating InvisiQ installer graphics: ${jobs.join(', ')}…`);
    for (const job of jobs) {
      await TARGETS[job]();
    }
    console.log('Done.');
    app.exit(0);
  } catch (err) {
    console.error('Failed to generate installer assets:', err);
    app.exit(1);
  }
});
