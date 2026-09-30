// Cuts the sample photos out with the same in-browser model the shop uses (for the crystal samples).
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage();
p.on('console', (m) => m.type() === 'error' && console.log('console:', m.text()));
await p.goto('http://localhost:4321/produse', { waitUntil: 'networkidle' });
for (const k of ['caine', 'cuplu', 'portret']) {
  const url = await p.evaluate(async (k) => {
    const { removeBackground } = await import('/src/lib/cutout.ts');
    const img = new Image();
    img.src = `/img/samples/${k}.jpg`;
    await img.decode();
    return (await removeBackground(img)).toDataURL('image/png');
  }, k);
  await writeFile(`public/img/samples/${k}-decupat.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log('ok', k);
}
await b.close();
