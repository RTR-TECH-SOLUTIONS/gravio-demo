import sharp from 'sharp';
for (const f of process.argv.slice(2)) {
  const img = sharp(f); const { width, height } = await img.metadata();
  const W = 400, H = Math.round(400 * height / width);
  const { data } = await img.resize(W, H).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const bg = [0,1,2].map(c => data[c]);
  // per row/col counts of pixels differing from bg
  const rows = new Array(H).fill(0), cols = new Array(W).fill(0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const p = (y*W+x)*3; const d = Math.abs(data[p]-bg[0])+Math.abs(data[p+1]-bg[1])+Math.abs(data[p+2]-bg[2]); if (d > 45) { rows[y]++; cols[x]++; } }
  const s = v => v * width / W;
  const fy = rows.findIndex(v => v > 3), ly = H - 1 - [...rows].reverse().findIndex(v => v > 3);
  const fx = cols.findIndex(v => v > 3), lx = W - 1 - [...cols].reverse().findIndex(v => v > 3);
  console.log(f, width + 'x' + height, 'bbox', [s(fx), s(fy), s(lx), s(ly)].map(Math.round).join(','));
}
