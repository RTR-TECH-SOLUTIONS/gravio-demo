import { chromium } from 'playwright';
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const b = await chromium.launch({ executablePath: exe });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ro-RO', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36' });
const p = await ctx.newPage();
await p.goto('https://www.stargift.ro/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
const acc = p.getByRole('button', { name: 'Accept', exact: true }); if (await acc.count()) await acc.first().click().catch(()=>{});
const H = await p.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < H; y += 600) { await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(150); }
let i = 0;
for (let y = 0; y < Math.min(H, 9000); y += 850) { await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(500); await p.screenshot({ path: `/tmp/sg-${String(i++).padStart(2,'0')}.jpg`, type: 'jpeg', quality: 60 }); }
const css = await p.evaluate(() => {
  const g = (sel) => { const e = document.querySelector(sel); if (!e) return null; const s = getComputedStyle(e); return { color: s.color, bg: s.backgroundColor, font: s.fontFamily, size: s.fontSize, weight: s.fontWeight, radius: s.borderRadius }; };
  return { body: g('body'), h1: g('h1'), h3: g('h3'), btn: g('.btn, button'), price: g('[class*=price]'), a: g('nav a') };
});
console.log(JSON.stringify(css, null, 1));
await b.close();
