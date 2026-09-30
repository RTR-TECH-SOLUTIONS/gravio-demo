// Catalog data. TODO(real): moves to the commerce backend (Medusa / Supabase); keep the same shape.

export type MaterialId = 'lemn' | 'piele' | 'piele-neagra' | 'inox' | 'ardezie' | 'ceramica' | 'vopsea' | 'sticla' | 'cristal';

export interface Area {
  /** fractions of the product photo (0..1) */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Cylinder {
  /** 3D view, all in body-radius units; arcDeg = how far the engraving wraps */
  height: number;
  arcDeg: number;
  decalH: number;
  decalY: number;
  handle: boolean;
  lid?: boolean;
  glass?: boolean;
  bodyColor: string;
  /** stemmed glass: stem length and foot radius, in body-radius units */
  stem?: { length: number; foot: number };
  /** rounded wine bowl instead of a straight wall */
  round?: boolean;
}

/** 3D crystal block, sizes in mm; the engraving floats inside */
export interface Crystal {
  w: number;
  h: number;
  d: number;
  /** LED base: included, or offered as an extra for this price */
  led?: 'inclus' | number;
}

export interface Sample {
  photo?: 'caine' | 'cuplu' | 'portret' | 'caine-decupat' | 'cuplu-decupat' | 'portret-decupat';
  shape?: 'rect' | 'oval' | 'heart' | 'circle';
  style?: 'foto' | 'puncte' | 'contur' | 'contrast';
  text?: string;
  text2?: string;
  font?: 'script' | 'serif' | 'sans' | 'type';
  textPos?: 'sus' | 'jos';
}

export interface ProductColor {
  id: string;
  label: string;
  hex: string;
  /** what the laser does on this colour, when it differs from the product */
  material?: MaterialId;
  /** false when the laser leaves no visible mark (white ceramic): colour print only */
  laser?: boolean;
}

export interface Product {
  slug: string;
  name: string;
  short: string;
  category: CategoryId;
  occasions: OccasionId[];
  material: MaterialId;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  /** blank product photo, used by the personaliser */
  image: string;
  area: Area;
  /** more copies of the same design on one photo (set of two flutes) */
  extraAreas?: Area[];
  warp?: 'cylinder';
  crystal?: Crystal;
  cylinder?: Cylinder;
  /** engraving size in mm, shown to the customer */
  engraveMm: string;
  sample: Sample;
  details: string[];
  care: string;
  leadDays: string;
  bestseller?: boolean;
  isNew?: boolean;
  /** UV colour print offered next to the laser */
  print?: boolean;
  /** colour variants; the first one is the colour in the product photo */
  colors?: ProductColor[];
}

export const CATEGORIES = {
  cristale: { name: 'Cristale 3D', short: 'Cristale' },
  pahare: { name: 'Pahare gravate', short: 'Pahare' },
  cani: { name: 'Căni și halbe', short: 'Căni' },
} as const;
export type CategoryId = keyof typeof CATEGORIES;

export const OCCASIONS = {
  'pentru-ea': 'Pentru ea',
  'pentru-el': 'Pentru el',
  nunta: 'Nuntă și nași',
  botez: 'Botez',
  aniversare: 'Zi de naștere',
  parinti: 'Pentru părinți',
  animale: 'Animale de companie',
  corporate: 'Corporate',
} as const;
export type OccasionId = keyof typeof OCCASIONS;

const px = (x0: number, y0: number, x1: number, y1: number, size = 2048): Area => ({
  x: x0 / size,
  y: y0 / size,
  w: (x1 - x0) / size,
  h: (y1 - y0) / size,
});

export const PRODUCTS: Product[] = [
  {
    slug: 'cristal-3d-portret',
    name: 'Cristal 3D cu poză gravată în interior, 50 × 80 mm',
    short: 'Bloc de cristal optic. Laserul desenează poza în interiorul sticlei, din sute de mii de puncte fine, fără să atingă suprafața.',
    category: 'cristale',
    occasions: ['pentru-ea', 'pentru-el', 'parinti', 'animale', 'aniversare'],
    material: 'cristal',
    price: 149,
    oldPrice: 179,
    rating: 4.9,
    reviews: 386,
    image: '/img/products/cristal-portret.jpg',
    area: px(700, 450, 1355, 1600),
    crystal: { w: 50, h: 80, d: 50, led: 39 },
    engraveMm: '40 × 65 mm',
    sample: { photo: 'caine-decupat', shape: 'rect', style: 'foto', text: 'Max', font: 'script', textPos: 'jos' },
    details: ['Cristal optic K9, 50 × 80 × 50 mm', 'Gravură 3D în interior, nu se zgârie și nu se șterge', 'Fundalul pozei îl decupăm noi, gratuit', 'Cutie de prezentare inclusă'],
    care: 'Se șterge cu o lavetă din microfibră. Feriți-l de lumina directă a soarelui, lentila poate concentra razele.',
    leadDays: '2-3 zile lucrătoare',
    bestseller: true,
  },
  {
    slug: 'cristal-3d-peisaj',
    name: 'Cristal 3D peisaj pentru poze de cuplu, 80 × 50 mm',
    short: 'Format lat, potrivit pentru două persoane sau o poză de familie. Poza plutește în interiorul cristalului.',
    category: 'cristale',
    occasions: ['nunta', 'pentru-ea', 'parinti', 'aniversare'],
    material: 'cristal',
    price: 169,
    rating: 4.9,
    reviews: 214,
    image: '/img/products/cristal-peisaj.jpg',
    area: px(380, 650, 1670, 1420),
    crystal: { w: 80, h: 50, d: 50, led: 39 },
    engraveMm: '70 × 40 mm',
    sample: { photo: 'portret-decupat', shape: 'rect', style: 'foto', text: 'Ana & Mihai', font: 'script', textPos: 'jos' },
    details: ['Cristal optic K9, 80 × 50 × 50 mm', 'Gravură 3D în interior, vizibilă din toate unghiurile', 'Text sub poză, gratuit', 'Cutie de prezentare inclusă'],
    care: 'Se șterge cu o lavetă din microfibră. Feriți-l de lumina directă a soarelui.',
    leadDays: '2-3 zile lucrătoare',
    bestseller: true,
  },
  {
    slug: 'cub-cristal-3d',
    name: 'Cub de cristal 3D cu poză, 60 mm',
    short: 'Cub masiv de cristal optic, cu poza gravată în centru. Arată bine pe birou sau pe raft, din orice parte.',
    category: 'cristale',
    occasions: ['pentru-el', 'animale', 'corporate', 'aniversare'],
    material: 'cristal',
    price: 179,
    rating: 4.8,
    reviews: 97,
    image: '/img/products/cristal-cub.jpg',
    area: px(640, 640, 1430, 1440),
    crystal: { w: 60, h: 60, d: 60, led: 39 },
    engraveMm: '50 × 50 mm',
    sample: { photo: 'caine-decupat', shape: 'rect', style: 'foto', text: 'Max', font: 'serif', textPos: 'jos' },
    details: ['Cristal optic K9, cub de 60 mm', 'Gravură 3D în interior', 'Fundalul pozei îl decupăm noi, gratuit', 'Cutie de prezentare inclusă'],
    care: 'Se șterge cu o lavetă din microfibră. Feriți-l de lumina directă a soarelui.',
    leadDays: '2-3 zile lucrătoare',
    isNew: true,
  },
  {
    slug: 'cristal-3d-baza-led',
    name: 'Cristal 3D cu bază LED, 50 × 80 mm',
    short: 'Cristalul vine pe o bază neagră cu LED alb. În întuneric poza se aprinde și pare că plutește.',
    category: 'cristale',
    occasions: ['pentru-ea', 'nunta', 'parinti', 'aniversare'],
    material: 'cristal',
    price: 189,
    oldPrice: 219,
    rating: 4.9,
    reviews: 158,
    image: '/img/products/cristal-led.jpg',
    area: px(740, 400, 1320, 1440),
    crystal: { w: 50, h: 80, d: 50, led: 'inclus' },
    engraveMm: '40 × 65 mm',
    sample: { photo: 'portret-decupat', shape: 'rect', style: 'foto', text: 'Ana & Mihai', text2: '14 iunie 2025', font: 'script', textPos: 'jos' },
    details: ['Cristal optic K9, 50 × 80 × 50 mm', 'Bază LED alb, cablu USB inclus', 'Gravură 3D în interior', 'Cutie de prezentare inclusă'],
    care: 'Cristalul se șterge cu o lavetă din microfibră. Baza nu se udă.',
    leadDays: '2-3 zile lucrătoare',
    bestseller: true,
  },
  {
    slug: 'pahar-sampanie-gravat',
    name: 'Pahar de șampanie gravat cu poză sau nume',
    short: 'Flute din cristal fără plumb, 200 ml. Poza apare albă, mată, pe peretele paharului.',
    category: 'pahare',
    occasions: ['nunta', 'pentru-ea', 'aniversare'],
    material: 'sticla',
    price: 59,
    rating: 4.8,
    reviews: 271,
    image: '/img/products/flute.jpg',
    area: px(872, 260, 1168, 820),
    warp: 'cylinder',
    cylinder: { height: 6.4, arcDeg: 120, decalH: 3.55, decalY: 0.55, handle: false, glass: true, bodyColor: '#e9eef0', stem: { length: 5.3, foot: 1.6 } },
    engraveMm: '35 × 60 mm',
    sample: { photo: 'portret', shape: 'rect', style: 'puncte' },
    details: ['Cristal fără plumb, 200 ml', 'Gravură laser, albă și mată', 'Se spală de mână', 'Cutie cadou inclusă'],
    care: 'Spălare manuală cu apă caldă. Nu se pune în mașina de spălat vase.',
    leadDays: '1-2 zile lucrătoare',
    bestseller: true,
  },
  {
    slug: 'set-2-pahare-sampanie-miri',
    name: 'Set 2 pahare de șampanie gravate pentru miri',
    short: 'Două flute gravate la fel, cu poza sau numele mirilor și data nunții. Vin în cutie dublă.',
    category: 'pahare',
    occasions: ['nunta', 'aniversare'],
    material: 'sticla',
    price: 109,
    oldPrice: 118,
    rating: 4.9,
    reviews: 189,
    image: '/img/products/set-flute.jpg',
    area: px(566, 270, 846, 800),
    extraAreas: [px(1198, 270, 1480, 800)],
    warp: 'cylinder',
    cylinder: { height: 6.4, arcDeg: 120, decalH: 3.55, decalY: 0.55, handle: false, glass: true, bodyColor: '#e9eef0', stem: { length: 5.3, foot: 1.6 } },
    engraveMm: '35 × 60 mm pe fiecare',
    sample: { text: 'Ana & Mihai', text2: '14.06.2025', font: 'script' },
    details: ['2 flute din cristal fără plumb, 200 ml', 'Aceeași gravură pe ambele pahare', 'Cutie cadou dublă', 'Se spală de mână'],
    care: 'Spălare manuală cu apă caldă. Nu se pune în mașina de spălat vase.',
    leadDays: '1-2 zile lucrătoare',
    bestseller: true,
  },
  {
    slug: 'pahar-vin-gravat',
    name: 'Pahar de vin gravat cu mesaj',
    short: 'Pahar de vin roșu, 650 ml, cu bol larg. Gravura albă se vede cel mai bine cu vin în pahar.',
    category: 'pahare',
    occasions: ['pentru-ea', 'parinti', 'aniversare'],
    material: 'sticla',
    price: 59,
    rating: 4.7,
    reviews: 132,
    image: '/img/products/vin.jpg',
    area: px(690, 300, 1370, 760),
    warp: 'cylinder',
    cylinder: { height: 2.1, arcDeg: 120, decalH: 1.0, decalY: 0.12, handle: false, glass: true, bodyColor: '#e9eef0', stem: { length: 1.9, foot: 0.72 }, round: true },
    engraveMm: '70 × 45 mm',
    sample: { text: 'Pentru cea mai', text2: 'bună mamă', font: 'script' },
    details: ['Cristal fără plumb, 650 ml', 'Gravură laser, albă și mată', 'Se spală de mână', 'Cutie cadou inclusă'],
    care: 'Spălare manuală cu apă caldă. Nu se pune în mașina de spălat vase.',
    leadDays: '1-2 zile lucrătoare',
  },
  {
    slug: 'pahar-whisky-gravat',
    name: 'Pahar de whisky gravat cu nume și an',
    short: 'Pahar cu bază grea, 320 ml. Gravura mată rămâne pe viață, nu se decolorează la spălare.',
    category: 'pahare',
    occasions: ['pentru-el', 'parinti', 'aniversare', 'corporate'],
    material: 'sticla',
    price: 59,
    rating: 4.8,
    reviews: 264,
    image: '/img/products/whisky.jpg',
    area: px(640, 680, 1420, 1400),
    warp: 'cylinder',
    cylinder: { height: 2.45, arcDeg: 125, decalH: 1.5, decalY: 0.23, handle: false, glass: true, bodyColor: '#e9eef0' },
    engraveMm: '75 × 60 mm',
    sample: { text: 'Andrei', text2: 'din 1996', font: 'script' },
    details: ['Cristal fără plumb, 320 ml', 'Bază groasă de 2 cm', 'Gravură laser, albă și mată', 'Cutie cadou inclusă'],
    care: 'Spălare manuală cu apă caldă.',
    leadDays: '1-2 zile lucrătoare',
  },
  {
    slug: 'cana-sticla-gravata-cu-poza',
    name: 'Cană de sticlă gravată cu poză',
    short: 'Cană din sticlă groasă, 300 ml. Poza se gravează pe tot panoul din față, ca o fotografie mată.',
    category: 'cani',
    occasions: ['pentru-ea', 'pentru-el', 'animale', 'parinti'],
    material: 'sticla',
    price: 49,
    oldPrice: 59,
    rating: 4.8,
    reviews: 318,
    image: '/img/products/cana-sticla.jpg',
    area: px(650, 590, 1320, 1400),
    warp: 'cylinder',
    cylinder: { height: 2.88, arcDeg: 125, decalH: 1.94, decalY: 0.2, handle: true, glass: true, bodyColor: '#e9eef0' },
    engraveMm: '80 × 80 mm',
    sample: { photo: 'caine', shape: 'rect', style: 'puncte' },
    details: ['Sticlă termorezistentă, 300 ml', 'Merge pentru ceai și cafea fierbinte', 'Gravură laser, albă și mată', 'Se spală de mână'],
    care: 'Spălare manuală. Gravura rezistă și la mașina de spălat vase, dar își păstrează contrastul mai bine la spălarea de mână.',
    leadDays: '1-2 zile lucrătoare',
    bestseller: true,
  },
  {
    slug: 'halba-bere-gravata',
    name: 'Halbă de bere gravată, 500 ml',
    short: 'Halbă din sticlă groasă, cu toartă. Gravura se vede cel mai bine cu bere rece în ea.',
    category: 'cani',
    occasions: ['pentru-el', 'aniversare', 'corporate'],
    material: 'sticla',
    price: 69,
    rating: 4.8,
    reviews: 176,
    image: '/img/products/halba.jpg',
    area: px(660, 450, 1330, 1480),
    warp: 'cylinder',
    cylinder: { height: 3.35, arcDeg: 125, decalH: 2.45, decalY: 0.18, handle: true, glass: true, bodyColor: '#e9eef0' },
    engraveMm: '80 × 110 mm',
    sample: { text: 'La mulți ani,', text2: 'Radu!', font: 'sans' },
    details: ['Sticlă groasă, 500 ml', 'Gravură laser, albă și mată', 'Se spală de mână', 'Cutie cadou inclusă'],
    care: 'Spălare manuală cu apă caldă.',
    leadDays: '1-2 zile lucrătoare',
    isNew: true,
  },
];

export const MATERIAL_NAMES: Record<MaterialId, string> = {
  lemn: 'lemn masiv',
  piele: 'piele naturală',
  'piele-neagra': 'piele naturală neagră',
  inox: 'oțel inoxidabil',
  ardezie: 'ardezie naturală',
  ceramica: 'ceramică cu glazură mată',
  vopsea: 'inox vopsit în câmp electrostatic',
  sticla: 'sticlă și cristal fără plumb',
  cristal: 'cristal optic K9',
};

export const bySlug =(slug: string) => PRODUCTS.find((p) => p.slug === slug);
export const catalogImage = (p: Product) => `/img/products/${p.slug}.jpg`;
export const lei = (n: number) => `${n.toLocaleString('ro-RO')} lei`;
