import { chromium } from 'playwright';
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const [url, out, w = '1440', h = '900', full = '1'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto(url, { waitUntil: 'networkidle' });
const H = await p.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < H; y += 500) { await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(100); }
await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(1500);
await p.screenshot({ path: out, type: 'jpeg', quality: 70, fullPage: full === '1' });
console.log('h', H, 'errors', JSON.stringify(errs.slice(0, 5)));
await b.close();
