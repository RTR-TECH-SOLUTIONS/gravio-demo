import { chromium } from 'playwright';
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
p.on('pageerror', e => console.log('ERR', e.message));
for (const [slug, name, view] of [['placa-ardezie-foto-gravata', 'ardezie'], ['cana-neagra-gravata-cu-poza', 'cana3d'], ['cana-neagra-gravata-cu-poza', 'canafoto', 'Poză'], ['bloc-foto-lemn-gravat', 'lemn']]) {
  await p.goto('http://localhost:4321/produs/' + slug, { waitUntil: 'networkidle' });
  if (slug.startsWith('placa')) { await p.setInputFiles('input[type=file]', 'public/img/samples/caine.jpg'); }
  if (view) await p.getByRole('radio', { name: view, exact: true }).click();
  await p.waitForTimeout(2500);
  const box = await p.locator('canvas').first().boundingBox();
  await p.screenshot({ path: `/tmp/z-${name}.jpg`, type: 'jpeg', quality: 85, clip: { x: box.x + box.width * 0.2, y: box.y + box.height * 0.2, width: box.width * 0.6, height: box.height * 0.6 } });
}
await b.close();
