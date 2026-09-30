import { chromium } from 'playwright';
import sharp from 'sharp';
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage();
page.on('console', (m) => m.type() === 'error' && console.log('console:', m.text()));
await page.goto(process.env.URL || 'http://localhost:4321/randare');
await page.waitForFunction(() => document.getElementById('status')?.textContent === 'gata');
const out = await page.evaluate(() => window.renderAll());
for (const [slug, data] of Object.entries(out)) {
  await sharp(Buffer.from(data.split(',')[1], 'base64')).resize(1000).jpeg({ quality: 88, mozjpeg: true }).toFile(`public/img/products/${slug}.jpg`);
  console.log('ok', slug);
}
await browser.close();
