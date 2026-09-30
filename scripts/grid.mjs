import sharp from 'sharp';
const [f, out] = process.argv.slice(2);
const S = 1024; let lines = '';
for (let v = 0; v <= 2048; v += 128) { const p = v / 2; lines += `<line x1="${p}" y1="0" x2="${p}" y2="${S}" stroke="red" stroke-width="${v%512?0.6:1.6}"/><line x1="0" y1="${p}" x2="${S}" y2="${p}" stroke="red" stroke-width="${v%512?0.6:1.6}"/><text x="${p+2}" y="12" font-size="11" fill="red">${v}</text><text x="2" y="${p-2}" font-size="11" fill="red">${v}</text>`; }
await sharp(f).resize(S, S).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">${lines}</svg>`) }]).jpeg({ quality: 80 }).toFile(out);
