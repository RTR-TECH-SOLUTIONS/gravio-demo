import * as THREE from 'three';

/**
 * Product-photo lighting for glass: a dark room with tall soft light strips on the sides.
 * Glass picks up clean vertical highlights and flat faces stay dark (no ceiling glare).
 */
export function studioEnvironment(renderer: THREE.WebGLRenderer) {
  const room = new THREE.Scene();
  room.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: 0x0c0c0e, side: THREE.BackSide })));
  const strip = (x: number, z: number, w: number, strength: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(strength, strength, strength) }));
    m.position.set(x, 0, z);
    m.lookAt(0, 0, 0);
    room.add(m);
  };
  strip(-8, 4, 2.2, 1.9);
  strip(8, 4, 2.2, 1.4);
  strip(-5, -9, 3, 0.8);
  strip(6, -8, 2, 0.8);
  // faint fill from the front so the camera-facing side is not black
  strip(0, 12, 6, 0.18);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(room, 0.02).texture;
  pmrem.dispose();
  return tex;
}
