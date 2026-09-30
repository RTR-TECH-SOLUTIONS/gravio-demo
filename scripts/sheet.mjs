import sharp from 'sharp';
const files = process.argv.slice(3); const out = process.argv[2];
const S = 400, cols = 5; const rows = Math.ceil(files.length / cols);
const tiles = await Promise.all(files.map(async (f, i) => ({ input: await sharp(f).resize(S, S, { fit: 'contain', background: '#fff' }).jpeg().toBuffer(), left: (i % cols) * S, top: Math.floor(i / cols) * S })));
await sharp({ create: { width: cols * S, height: rows * S, channels: 3, background: '#fff' } }).composite(tiles).jpeg({ quality: 80 }).toFile(out);
