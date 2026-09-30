import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Crystal } from '../data/catalog';
import { ADD_LIGHT } from './Cylinder3D';
import { studioEnvironment } from '../lib/studio';

interface Props {
  crystal: Crystal;
  /** burn map canvas: alpha = how dense the laser dots are */
  burn: HTMLCanvasElement | null;
  version: number;
  led: boolean;
}

const MM = 1 / 20; // world units per millimetre

/**
 * Sub-surface laser engraving as the eye sees it: a smooth white photo floating in the glass,
 * with a very fine grain (the laser points are far smaller than a screen pixel).
 */
function engravingTexture(burn: HTMLCanvasElement, tint: [number, number, number]) {
  const c = document.createElement('canvas');
  c.width = burn.width;
  c.height = burn.height;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(burn, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = d[i + 3] / 255;
    // gentle curve keeps mid tones, fine grain gives the etched, crystalline texture
    const a = Math.pow(v, 1.15) * (0.82 + Math.random() * 0.3);
    d[i] = tint[0];
    d[i + 1] = tint[1];
    d[i + 2] = tint[2];
    d[i + 3] = Math.min(255, a * 255);
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export default function Crystal3D({ crystal, burn, version, led }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ setBurn: (b: HTMLCanvasElement) => void } | null>(null);

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.environment = studioEnvironment(renderer);

    const W = crystal.w * MM;
    const H = crystal.h * MM;
    const D = crystal.d * MM;
    const group = new THREE.Group();
    scene.add(group);

    // clear glass: faint body, bright bevelled edges and reflections, like the studio photos
    const boxGeo = new RoundedBoxGeometry(W, H, D, 4, 0.035);
    const glass = new THREE.Mesh(
      boxGeo,
      new THREE.MeshPhysicalMaterial({
        color: 0x000000,
        roughness: 0.02,
        clearcoat: 0.4,
        clearcoatRoughness: 0.05,
        envMapIntensity: 0.14,
        transparent: true,
        ...ADD_LIGHT,
        depthWrite: false,
      }),
    );
    glass.renderOrder = 1;
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(W * 0.995, H * 0.995, D * 0.995)),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }),
    );
    group.add(edges);
    group.add(glass);

    // the picture, centred with a margin like the real blocks
    const planeW = W * 0.78;
    const planeHMax = H * 0.84;
    // a few layers a hair apart: reads as one smooth picture from the front, gains depth when turned
    const LAYERS = [-0.012, 0, 0.012];
    const layers = LAYERS.map((z, i) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: i === 1 ? 0.62 : 0.26,
          side: THREE.DoubleSide,
          depthWrite: false,
          ...ADD_LIGHT,
        }),
      );
      m.position.z = z;
      m.renderOrder = 2;
      m.visible = false;
      group.add(m);
      return m;
    });
    const setBurn = (b: HTMLCanvasElement) => {
      let pw = planeW;
      let ph = (planeW * b.height) / b.width;
      if (ph > planeHMax) {
        pw *= planeHMax / ph;
        ph = planeHMax;
      }
      const tex = engravingTexture(b, led ? [236, 244, 255] : [240, 242, 244]);
      for (const m of layers) {
        const mat = m.material as THREE.MeshBasicMaterial;
        mat.map?.dispose();
        mat.map = tex;
        mat.needsUpdate = true;
        m.scale.set(pw, ph, 1);
        m.visible = true;
      }
    };

    let base: THREE.Mesh | null = null;
    if (led) {
      const bh = 0.32;
      base = new THREE.Mesh(
        new RoundedBoxGeometry(W * 1.28, bh, D * 1.28, 3, 0.03),
        new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.45, metalness: 0.3 }),
      );
      base.position.y = -H / 2 - bh / 2;
      group.add(base);
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(W * 1.02, D * 1.02),
        new THREE.MeshBasicMaterial({ color: 0xcfe4ff, transparent: true, opacity: 0.32, ...ADD_LIGHT }),
      );
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = -H / 2 + 0.002;
      group.add(glow);
      const light = new THREE.PointLight(0xdfeeff, 6, H * 3);
      light.position.set(0, -H / 2 + 0.05, 0);
      group.add(light);
    }

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(-3, 4, 5);
    scene.add(key);

    const floorY = -H / 2 - (led ? 0.32 : 0);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = shadowCanvas.height = 256;
    const sg = shadowCanvas.getContext('2d')!;
    const grd = sg.createRadialGradient(128, 128, 8, 128, 128, 128);
    grd.addColorStop(0, led ? 'rgba(200,225,255,0.22)' : 'rgba(0,0,0,0.45)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    sg.fillStyle = grd;
    sg.fillRect(0, 0, 256, 256);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 3, D * 3),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = floorY - 0.005;
    group.add(shadow);
    group.position.y = led ? 0.16 : 0;

    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    const fit = Math.max(H + (led ? 0.4 : 0), W * 1.1);
    camera.position.set(0, fit * 0.3, fit * 2.6);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.minDistance = fit * 1.6;
    controls.maxDistance = fit * 3.4;
    controls.minPolarAngle = Math.PI * 0.25;
    controls.maxPolarAngle = Math.PI * 0.6;
    controls.update();

    api.current = { setBurn };

    const resize = () => {
      const { width, height } = el.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let idle = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    controls.addEventListener('start', () => (idle = false));
    renderer.setAnimationLoop((t) => {
      if (idle) group.rotation.y = Math.sin((t - t0) / 2200) * 0.55;
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      api.current = null;
      renderer.setAnimationLoop(null);
      ro.disconnect();
      controls.dispose();
      scene.environment?.dispose();
      renderer.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.LineSegments) {
          o.geometry.dispose();
          const m = o.material as THREE.MeshBasicMaterial;
          m.map?.dispose();
          m.dispose();
        }
      });
      el.removeChild(renderer.domElement);
    };
  }, [crystal, led]);

  useEffect(() => {
    if (burn && api.current) api.current.setBurn(burn);
  }, [burn, version, crystal, led]);

  return (
    <div
      ref={host}
      className="h-full w-full cursor-grab active:cursor-grabbing [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full"
      aria-label="Previzualizare 3D a cristalului, trage ca să-l rotești"
      role="img"
    />
  );
}
