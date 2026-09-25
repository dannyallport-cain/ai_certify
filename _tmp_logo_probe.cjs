const path = require('node:path');
const fs = require('node:fs');

const outLines = [];
const log = (line) => outLines.push(line);
const flush = () => fs.writeFileSync(path.join(process.cwd(), '_tmp_logo_probe_out.txt'), outLines.join('\n') + '\n');

const publicDir = path.join(process.cwd(), 'public');

async function main() {
  let canvas = null;
  try {
    canvas = require('canvas');
    log('canvas module loaded. version = ' + (canvas.version || '(unknown)'));
  } catch (err) {
    log('canvas module FAILED TO LOAD: ' + err.message);
  }

  const candidates = [
    '/gas-safe-logo.png',
    '/logos/niceic-logo.png',
    '/NAPIT-Member-Logo.webp',
    '/logos/stroma.png',
    '/logos/bafe-logo.png',
    '/BAFE-Logo.webp',
    '/logos/BAFE Logo.png',
  ];

  for (const rel of candidates) {
    const absolutePath = path.join(publicDir, rel.replace(/^\//, ''));
    let stat;
    try {
      stat = await fs.promises.stat(absolutePath);
    } catch (err) {
      log(rel + ' -> FILE MISSING -> ' + absolutePath);
      continue;
    }

    if (!canvas) {
      log(rel + ' -> exists (' + stat.size + ' bytes) but canvas unavailable');
      continue;
    }

    const ext = path.extname(rel).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    const buf = await fs.promises.readFile(absolutePath);
    const dataUri = 'data:' + mime + ';base64,' + buf.toString('base64');

    try {
      const image = await canvas.loadImage(dataUri);
      const cv = canvas.createCanvas(Math.max(1, image.width), Math.max(1, image.height));
      const ctx = cv.getContext('2d');
      ctx.drawImage(image, 0, 0, cv.width, cv.height);
      const out = cv.toDataURL('image/png');
      log(rel + ' -> OK ' + image.width + 'x' + image.height + ', png data uri ' + out.length + ' chars');
    } catch (err) {
      log(rel + ' -> loadImage FAILED: ' + err.message);
    }
  }

  flush();
}

main().catch((err) => {
  log('FATAL: ' + (err && err.stack ? err.stack : String(err)));
  flush();
});
