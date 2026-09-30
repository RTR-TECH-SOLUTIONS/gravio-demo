import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { studioEnvironment } from '../lib/studio';
import type { Cylinder, MaterialId } from '../data/catalog';

interface Props {
  cylinder: Cylinder;
  material: MaterialId;
  /** burn map canvas; the component re-uploads it when `version` changes */
  burn: HTMLCanvasElement | null;
  version: number;
  /** colour print instead of engraving: matte ink, never metallic */
  print?: boolean;
}

/** Adds light without touching the canvas alpha, so the page background still shows through. */
export const ADD_LIGHT = {
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.SrcAlphaFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor,
  blendDstAlpha: THREE.OneFactor,
} as const;

function lathe(points: [number, number][], segments = 96) {
  return new THREE.LatheGeometry(
    points.map(([x, y]) => new THREE.Vector2(x, y)),
    segments,
  );
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  grd.addColorStop(0, 'rgba(0,0,0,0.38)');
  grd.addColorStop(0.55, 'rgba(0,0,0,0.12)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export default function Cylinder3D({ cylinder, material, burn, version, print = false }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const decalTex = useRef<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    // glass wants the dark studio with light strips; opaque products the soft room
    scene.environment = cylinder.glass ? studioEnvironment(renderer) : pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(-4, 5, 6);
    scene.add(key);

    const { height: H, handle, lid, glass, bodyColor } = cylinder;
    const group = new THREE.Group();
    scene.add(group);

    const bodyMat = glass
      ? // clear glass as a faint body with strong reflections (transmission turns milky on a transparent canvas)
        // black + additive: only reflections add light, so edges glow and the middle stays clear
        new THREE.MeshPhysicalMaterial({
          color: 0x000000,
          roughness: 0.04,
          clearcoat: 1,
          clearcoatRoughness: 0.02,
          envMapIntensity: 3,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
          ...ADD_LIGHT,
        })
      : new THREE.MeshStandardMaterial({
          color: bodyColor,
          roughness: material === 'vopsea' ? 0.55 : 0.7,
          metalness: material === 'vopsea' ? 0.35 : 0.02,
          side: THREE.DoubleSide,
        });

    const h = H / 2;
    const wall = glass ? 0.07 : 0.06;
    const base = glass ? 0.55 : 0.12;
    const stem = cylinder.stem;
    // radius of the outer wall at height y (round wine bowl, tapered flute, or straight)
    const radius = (y: number) => {
      const t = (y + h) / H;
      if (cylinder.round) return t < 0.55 ? Math.max(0.02, Math.sin(((t / 0.55) * Math.PI) / 2)) : 1 - 0.26 * Math.pow((t - 0.55) / 0.45, 1.4);
      if (stem) return t < 0.16 ? Math.max(0.02, Math.sin(((t / 0.16) * Math.PI) / 2)) : 1;
      return 1;
    };
    const profile = (y0: number, y1: number, k = 1, n = 48) =>
      Array.from({ length: n + 1 }, (_, i) => {
        const y = y0 + ((y1 - y0) * i) / n;
        return new THREE.Vector2(radius(y) * k, y);
      });
    let body: THREE.BufferGeometry;
    if (stem || cylinder.round) {
      const outer = profile(-h, h);
      const inner = profile(-h + 0.12, h, 1, 48).map((v) => new THREE.Vector2(Math.max(0.01, v.x - wall), v.y)).reverse();
      body = new THREE.LatheGeometry([new THREE.Vector2(0, -h), ...outer, ...inner, new THREE.Vector2(0, -h + 0.12)], 96);
    } else {
      body = lathe([
        [0, -h],
        [0.96, -h],
        [1, -h + 0.05],
        [1, h],
        [1 - wall, h],
        [1 - wall, -h + base],
        [0, -h + base],
      ]);
    }
    group.add(new THREE.Mesh(body, bodyMat));

    if (stem) {
      const r = 0.03 * Math.pow(H, 0.6);
      group.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.3, stem.length, 24).translate(0, -h - stem.length / 2, 0), bodyMat));
      const foot = lathe([
        [0, -h - stem.length - 0.08],
        [stem.foot, -h - stem.length - 0.08],
        [stem.foot, -h - stem.length - 0.04],
        [r * 1.6, -h - stem.length + 0.05],
        [0, -h - stem.length + 0.05],
      ]);
      const footMat = (bodyMat as THREE.MeshPhysicalMaterial).clone();
      footMat.envMapIntensity = 0.8;
      group.add(new THREE.Mesh(foot, footMat));
    }

    if (handle) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.9, h * 0.62, 0),
        new THREE.Vector3(1.45, h * 0.62, 0),
        new THREE.Vector3(1.78, h * 0.2, 0),
        new THREE.Vector3(1.74, -h * 0.35, 0),
        new THREE.Vector3(1.4, -h * 0.62, 0),
        new THREE.Vector3(0.9, -h * 0.62, 0),
      ]);
      group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.14, 20, false), bodyMat));
    }

    if (lid) {
      const steel = new THREE.MeshStandardMaterial({ color: 0xc9c9c9, metalness: 1, roughness: 0.32 });
      const cap = lathe([
        [0, h + 1.12],
        [0.9, h + 1.12],
        [0.93, h + 1.06],
        [0.93, h + 0.06],
        [0.9, h],
        [0, h],
      ]);
      group.add(new THREE.Mesh(cap, steel));
    }

    // engraving: a thin open cylinder slice just outside the body
    const arc = THREE.MathUtils.degToRad(cylinder.arcDeg);
    const dy = cylinder.decalY;
    const decalGeo = new THREE.LatheGeometry(profile(dy - cylinder.decalH / 2, dy + cylinder.decalH / 2, 1.004, 32), 128, -arc / 2, arc);
    decalGeo.translate(0, -dy, 0);
    const tex = new THREE.CanvasTexture(burn ?? document.createElement('canvas'));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    decalTex.current = tex;
    const decalMat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      roughness: print ? 0.6 : material === 'vopsea' ? 0.3 : 0.9,
      // frosted glass scatters light and reads white even in a dark room
      ...(glass ? { emissive: new THREE.Color(0xffffff), emissiveMap: tex, emissiveIntensity: 0.6 } : {}),
      metalness: !print && material === 'vopsea' ? 0.9 : 0,
      depthWrite: false,
      // on clear glass the engraving shows through from the back, mirrored
      side: glass ? THREE.DoubleSide : THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const decal = new THREE.Mesh(decalGeo, decalMat);
    decal.position.y = cylinder.decalY;
    group.add(decal);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 4.4),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    const bottom = -h - (stem ? stem.length + 0.08 : 0);
    shadow.position.y = bottom - 0.01;
    group.add(shadow);

    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    const fit = Math.max(H + (lid ? 1.2 : 0) + (stem ? stem.length : 0), handle ? 3.8 : 3.1);
    camera.position.set(0, fit * 0.28, fit * 2.2);
    group.position.y = lid ? -0.55 : stem ? stem.length / 2 : 0;
    if (handle) group.position.x = -0.35;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.minDistance = fit * 1.4;
    controls.maxDistance = fit * 3;
    controls.minPolarAngle = Math.PI * 0.25;
    controls.maxPolarAngle = Math.PI * 0.58;
    controls.target.set(0, 0, 0);
    controls.update();

    const resize = () => {
      const { width, height } = el.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // gentle turn until the customer grabs it
    let idle = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    controls.addEventListener('start', () => (idle = false));
    renderer.setAnimationLoop((t) => {
      if (idle) group.rotation.y = Math.sin((t - t0) / 1800) * 0.45;
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      controls.dispose();
      pmrem.dispose();
      renderer.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const m = o.material as THREE.MeshStandardMaterial;
          m.map?.dispose();
          m.dispose();
        }
      });
      el.removeChild(renderer.domElement);
    };
  }, [cylinder, material, print]);

  useEffect(() => {
    const tex = decalTex.current;
    if (!tex || !burn) return;
    tex.image = burn;
    tex.needsUpdate = true;
  }, [burn, version]);

  return (
    <div
      ref={host}
      className="h-full w-full cursor-grab active:cursor-grabbing [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full"
      aria-label="Previzualizare 3D, trage ca să rotești produsul"
      role="img"
    />
  );
}
