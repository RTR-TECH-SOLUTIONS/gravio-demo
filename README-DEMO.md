# Gravio · demo magazin de cristale 3D și pahare gravate cu laser

Demo de prezentare (Astro 7 + React islands + Tailwind 4 + three.js). Structura după StarGift.ro.
Catalogul e doar sticlă și cristal, ca produsele reale ale clientului.

## Pornire
```
npm install
npm run dev        # http://localhost:4321
npm run build && npm run preview
```

## Ce merge
- **Pagina de produs** ca la StarGift / PrintBox: titlu, preț, opțiuni (bază LED la cristale), ambalaj cadou,
  buton „Personalizează” care deschide editorul pe tot ecranul (file Produsul / Fotografia / Textul).
- **Cristal 3D** (`src/components/Crystal3D.tsx`): blocul de sticlă se rotește, poza e un nor de puncte albe
  în interior, ca gravura laser 3D reală; baza LED opțională.
- **Pahare și căni** (`Cylinder3D.tsx`): flute, pahar de vin (cu picior), whisky, cană de sticlă, halbă;
  gravura albă mată pe peretele paharului, vizibilă și prin spate.
- **Decupare automată a fundalului** (`src/lib/cutout.ts`): MediaPipe DeepLab v3 (~2,7 MB, încărcat doar la
  nevoie) păstrează persoana sau animalul; la cristale se aplică automat, clientul poate reveni la poza întreagă.
- **Motor de gravură** (`src/lib/engrave.ts`): hartă de ardere (Foto / Puncte / Desen / Siluetă), materiale
  sticlă (panou cu margine dreaptă) și cristal. Imprimarea color și variantele de culoare există în cod,
  dar nu sunt folosite de produsele de sticlă.
- Catalog cu filtre (produs, ocazie, preț), coș în drawer, pagină de comandă cu validare.
- Pozele de catalog sunt generate cu același motor: `node scripts/render-catalog.mjs` (cu dev server pornit).
  Pozele goale de produs: `raw/glass` → `node scripts/process-glass.mjs`. Pozele exemplu decupate:
  `node scripts/cut-samples.mjs`.

## Ce e doar mock (`TODO(real)`)
- Coșul e în localStorage, comanda nu pleacă nicăieri, plata nu e reală.
- Catalogul e în `src/data/catalog.ts` (aceeași formă va veni din backend).
- Recenziile, cifrele și datele de contact sunt exemple.

## La proiectul real
1. Astro SSR/hybrid pe VPS + Coolify, motor de comerț Medusa (sau Supabase + Stripe pentru catalog mic).
2. Plăți: Stripe Checkout + Netopia; ramburs.
3. La comandă: upload poză originală + hartă de ardere la scară 1:1 (PNG/SVG în mm) în storage, atașate comenzii.
4. Admin: comenzi cu macheta, buton „trimite macheta pe WhatsApp", status confirmat / gravat / expediat.
5. Adăugare produse noi: poză produs gol + zona de gravare (x, y, w, h) + material; pentru pahare geometria 3D,
   pentru cristale dimensiunile în mm.
7. Pozele de produs sunt generate; se înlocuiesc cu pozele reale ale clientului (are cristale și pahare gravate).
6. E-mailuri tranzacționale (Resend), SEO + pachet legal (GDPR, ANPC/SOL, termeni), credit RTR.
