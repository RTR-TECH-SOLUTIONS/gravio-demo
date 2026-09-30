// Glass & crystal catalogue: raw generations -> public/img (products 2048, banners 1800).
import sharp from 'sharp';
const map = {
  0: 'products/cristal-portret', 1: 'products/cristal-peisaj', 2: 'products/cristal-cub', 3: 'products/cristal-led',
  4: 'products/flute', 5: 'products/vin', 6: 'products/whisky', 7: 'products/cana-sticla', 8: 'products/halba', 9: 'products/set-flute',
  10: 'banners/hero-cristal', 11: 'banners/nunta-flute', 12: 'banners/halba', 13: 'banners/atelier-cristal', 14: 'banners/corporate-cristal',
};
for (const [i, name] of Object.entries(map)) {
  const src = `raw/glass/${i}.png`;
  try {
    const banner = name.startsWith('banners');
    await sharp(src).resize({ width: banner ? 1800 : 2048 }).jpeg({ quality: banner ? 84 : 90, mozjpeg: true }).toFile(`public/img/${name}.jpg`);
  } catch { console.log('skip', src); }
}
console.log('ok');
