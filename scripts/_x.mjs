import { chromium } from 'playwright';
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const [out, ...slugs] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=metal', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
for (const s of slugs) {
  await p.goto('http://localhost:4321/produs/' + s, { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
  await p.locator('.aspect-square.max-h-\\[42vh\\]').first().screenshot({ path: `${out}/x-${s}.jpg`, type: 'jpeg', quality: 70 });
}
await b.close();
