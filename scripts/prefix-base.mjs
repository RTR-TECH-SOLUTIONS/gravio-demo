// After `astro build` for GitHub Pages: the site lives under /gravio-demo/, but links and image
// paths in the code start at "/". Prefix them in the built HTML and JS (Astro's own assets already are).
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = '/gravio-demo';
const ROOTS = 'img|produs|produse|cos|favicon\\.svg|randare';

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

let files = 0;
for await (const f of walk('dist')) {
  if (!/\.(html|js|css)$/.test(f)) continue;
  const src = await readFile(f, 'utf8');
  const out = src
    // "/img/…", '/produs/…', `/produse?…`, url(/img/…)
    .replace(new RegExp(`(["'\`(=])/(${ROOTS})(?=[/?#"'\`)$]|$)`, 'g'), `$1${BASE}/$2`)
    // links to the home page
    .replace(/href=(["'])\/(?=\1|#)/g, `href=$1${BASE}/`)
    // paths inside island props, where quotes are HTML-encoded
    .replace(new RegExp(`(&quot;)/(${ROOTS})(?=[/?#&])`, 'g'), `$1${BASE}/$2`);
  if (out !== src) {
    await writeFile(f, out);
    files++;
  }
}
console.log(`prefix-base: ${files} fișiere actualizate cu ${BASE}`);
