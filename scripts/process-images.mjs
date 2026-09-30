import sharp from 'sharp';
const map = {
  0: 'products/cana', 1: 'products/termos', 2: 'products/pahar', 3: 'products/tocator', 4: 'products/ardezie',
  5: 'products/bricheta', 6: 'products/breloc', 7: 'products/portofel', 8: 'products/cutie-vin', 9: 'products/bloc-foto',
  10: 'banners/hero-cana', 11: 'banners/hero-tocator', 12: 'banners/atelier', 13: 'banners/ardezie', 14: 'banners/piele',
  15: 'banners/pahare', 16: 'banners/nunta', 17: 'banners/corporate', 18: 'samples/caine', 19: 'samples/cuplu',
};
for (const [i, name] of Object.entries(map)) {
  const w = name.startsWith('banners') ? 1800 : 2048;
  await sharp(`raw/${i}.png`).resize({ width: w }).jpeg({ quality: name.startsWith('banners') ? 84 : 90, mozjpeg: true }).toFile(`public/img/${name}.jpg`);
}
console.log('ok');
