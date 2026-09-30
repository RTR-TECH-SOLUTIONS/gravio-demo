import { firefox, chromium } from 'playwright';
const which = process.argv[2] || 'firefox';
const opts = which === 'firefox'
  ? { executablePath: process.env.HOME + '/Library/Caches/ms-playwright/firefox-1538/firefox/Nightly.app/Contents/MacOS/firefox' }
  : { executablePath: process.env.HOME + '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' };
const b = await (which === 'firefox' ? firefox : chromium).launch(opts);
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => m.type() === 'error' && console.log('CONSOLE', m.text()));
for (const u of ['/produs/cana-neagra-gravata-cu-poza', '/produs/tocator-stejar-gravat', '/']) {
  await p.goto('http://localhost:4321' + u, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  console.log(u, 'preview visible:', await p.locator('text=Previzualizare live').first().isVisible());
}
await p.goto('http://localhost:4321/produs/cana-neagra-gravata-cu-poza', { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
await p.screenshot({ path: `/tmp/${which}.jpg`, type: 'jpeg', quality: 70 });
await b.close();
