// Cuts products out of their flat grey studio background (region growing from the borders).
import sharp from 'sharp';
const S = 1024;
const seeds = { 'cana-neagra-gravata-cu-poza': [[780, 500]], 'breloc-inox-gravat-cu-poza': [[512, 150]] };
const pairs = [
  ['raw/0.png', 'cana-neagra-gravata-cu-poza'], ['raw/1.png', 'termos-inox-gravat'], 
  ['raw/3.png', 'tocator-stejar-gravat'], ['raw/4.png', 'placa-ardezie-foto-gravata'], ['raw/5.png', 'bricheta-inox-gravata'],
  ['raw/6.png', 'breloc-inox-gravat-cu-poza'], ['raw/7.png', 'portofel-piele-gravat'], ['raw/8.png', 'cutie-vin-lemn-gravata'], ['raw/9.png', 'bloc-foto-lemn-gravat'],
];
for (const [src, slug] of pairs) {
  const { data } = await sharp(src).resize(S, S).blur(1.2).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const bg = new Uint8Array(S * S);
  const q = [];
  const px = (i) => [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];
  const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  for (let x = 0; x < S; x++) { q.push(x, (S - 1) * S + x); }
  for (let y = 0; y < S; y++) { q.push(y * S, y * S + S - 1); }
  for (const i of q) bg[i] = 1;
  const neutral = (c) => Math.max(...c) - Math.min(...c) < 26; // background is a warm grey, never saturated
  while (q.length) {
    const i = q.pop(); const c = px(i); const x = i % S, y = (i / S) | 0;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= S || ny >= S) continue;
      const j = ny * S + nx; if (bg[j]) continue;
      const n = px(j);
      if (dist(c, n) < 7 && neutral(n) && n[0] > 95) { bg[j] = 1; q.push(j); }
    }
  }
  // enclosed background (mug handle, key ring) + keep only the largest foreground piece
  let sr = 0, sg = 0, sb = 0, n = 0;
  for (let i = 0; i < S * S; i += 7) if (bg[i]) { const c = px(i); sr += c[0]; sg += c[1]; sb += c[2]; n++; }
  const mean = [sr / n, sg / n, sb / n];
  const comp = new Int32Array(S * S).fill(-1);
  const sizes = [];
  for (let s0 = 0; s0 < S * S; s0++) {
    if (bg[s0] || comp[s0] >= 0) continue;
    const id = sizes.length; let size = 0; const st = [s0]; comp[s0] = id; const members = [];
    while (st.length) {
      const i = st.pop(); size++; members.push(i); const x = i % S, y = (i / S) | 0;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= S || ny >= S) continue;
        const j = ny * S + nx; if (bg[j] || comp[j] >= 0) continue; comp[j] = id; st.push(j);
      }
    }
    sizes.push(size);
  }
  const main = sizes.indexOf(Math.max(...sizes));
  for (let i = 0; i < S * S; i++) if (!bg[i] && comp[i] !== main) bg[i] = 1;
  // holes (mug handle, key ring): region-grow from a seed placed inside them
  for (const [sx, sy] of seeds[slug] ?? []) {
    const st = [sy * S + sx]; bg[st[0]] = 1;
    while (st.length) {
      const i = st.pop(); const c = px(i); const x = i % S, y = (i / S) | 0;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= S || ny >= S) continue;
        const j = ny * S + nx; if (bg[j]) continue;
        const n = px(j);
        if (dist(c, n) < 9 && neutral(n) && n[0] > 90) { bg[j] = 1; st.push(j); }
      }
    }
  }
  const mask = Buffer.alloc(S * S);
  for (let i = 0; i < S * S; i++) mask[i] = bg[i] ? 0 : 255;
  // full-frame mask, aligned with the product photo: used to recolour products in the browser
  await sharp(mask, { raw: { width: S, height: S, channels: 1 } }).median(5).blur(1.1).png().toFile(`public/img/masks/${slug}.png`);
  const alpha = await sharp(mask, { raw: { width: S, height: S, channels: 1 } }).median(5).blur(1.1).resize(1000, 1000).extractChannel(0).raw().toBuffer();
  const base = await sharp(`public/img/products/${slug}.jpg`).resize(1000, 1000).removeAlpha().raw().toBuffer();
  const rgba = Buffer.alloc(1000 * 1000 * 4);
  for (let i = 0; i < 1000 * 1000; i++) { rgba[i*4] = base[i*3]; rgba[i*4+1] = base[i*3+1]; rgba[i*4+2] = base[i*3+2]; rgba[i*4+3] = alpha[i]; }
  await sharp(rgba, { raw: { width: 1000, height: 1000, channels: 4 } }).trim({ threshold: 1 }).webp({ quality: 88, alphaQuality: 90 }).toFile(`public/img/cutouts/${slug}.webp`);
  console.log('ok', slug);
}
