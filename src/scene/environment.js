// River slab, marina dock, moored boat, floating home and the far bank.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { C, hash } from './kit.js';

// Less water off the porch end, with that space moved past the entrance dock.
export const SLAB = { x0: -17.7, x1: 32.3, zBack: -23.5, zFront: 12 };
const SLAB_D = SLAB.zFront - SLAB.zBack;
const SLAB_C = (SLAB.zFront + SLAB.zBack) / 2;
const SLAB_W = SLAB.x1 - SLAB.x0;
const SLAB_X = (SLAB.x0 + SLAB.x1) / 2;

function pine(B, x, z, s, base) {
  B.cyl(C.trunk, 0.13 * s, 0.9 * s, x, base + 0.45 * s, z, { rt: 0.09 * s, n: 7, stroke: 0.0012 });
  [[1.15, 1.5, 1.35, C.pine], [0.92, 1.35, 2.25, C.pineLight], [0.68, 1.2, 3.05, C.pine], [0.42, 1.0, 3.8, C.pineLight]].forEach(([r, h, y, col], i) => {
    B.geo(col, new THREE.ConeGeometry(r * s, h * s, 9), x, base + y * s, z, { ry: i * 0.7, stroke: 0.0018 });
  });
}

function buildDock(B) {
  // Gangway, power pedestal, coiled line and mooring lines on the walkway behind the sauna.
  B.box(C.steelLight, 1.2, 0.04, 0.34, 3.0, 0.46, -2.72, { rz: 0.02, stroke: 0.001 });
  B.box(C.homeTeal, 0.3, 0.92, 0.26, -2.6, 0.8, -4.7, { r: 0.03, stroke: 0.0014 });
  B.box(C.frame, 0.2, 0.12, 0.02, -2.6, 1.02, -4.56, { stroke: 0 });
  for (let k = 0; k < 3; k++) B.geo(C.white, new THREE.TorusGeometry(0.2, 0.022, 6, 18), -5.2, 0.37 + k * 0.035, -3.6, { rx: Math.PI / 2, stroke: 0.0006 });
  for (const [ax, bx] of [[-5.9, -5.1], [0.0, 0.6], [5.6, 5.2]]) {
    B.box(C.frame, 0.26, 0.05, 0.08, ax, 0.37, -3.05, { stroke: 0 });
    const dx = bx - ax, dz = 0.45, len = Math.hypot(dx, dz);
    B.box(C.white, 0.022, 0.022, len, (ax + bx) / 2, 0.47, -2.83, { ry: Math.atan2(dx, dz), rx: -0.2, stroke: 0 });
  }
}

function buildSailboat(B) {
  const x = -4.7, z = -15.65;
  const s = new THREE.Shape();
  s.moveTo(-3.1, 0); s.quadraticCurveTo(-2.2, 1.1, 0, 1.1); s.quadraticCurveTo(2.2, 1.0, 3.3, 0);
  s.quadraticCurveTo(2.2, -1.0, 0, -1.1); s.quadraticCurveTo(-2.2, -1.1, -3.1, 0);
  const hull = new THREE.ExtrudeGeometry(s, { depth: 0.75, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1, curveSegments: 10 });
  B.geo(C.navy, hull, x, -0.15, z, { rx: Math.PI / 2, sz: -1, stroke: 0.0026 });
  const deck = new THREE.ShapeGeometry(s, 10);
  B.geo(C.hull, deck, x, 0.67, z, { rx: -Math.PI / 2, sx: 0.96, sy: 0.92, stroke: 0, cast: false });
  B.box(C.hull, 2.3, 0.45, 1.25, x - 0.2, 0.9, z, { r: 0.08, stroke: 0.0018 });
  for (const dx of [-0.8, -0.2, 0.4]) B.box(C.frame, 0.32, 0.12, 0.012, x + dx, 0.95, z + 0.63, { stroke: 0 });
  B.cyl(C.galv, 0.06, 7.2, x + 0.5, 4.2, z, { rt: 0.04, n: 8, stroke: 0.0018 });
  B.box(C.galv, 2.5, 0.05, 0.05, x - 0.75, 1.72, z, { stroke: 0.001 });
  B.box(C.navy, 2.35, 0.2, 0.2, x - 0.75, 1.82, z, { r: 0.06, stroke: 0.0012 });
  const stay = (x1, y1, z1, x2, y2, z2) => {
    const a = new THREE.Vector3(x1, y1, z1), b = new THREE.Vector3(x2, y2, z2);
    const g = new THREE.CylinderGeometry(0.012, 0.012, a.distanceTo(b), 4);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    const e = new THREE.Euler().setFromQuaternion(q);
    const m = a.clone().add(b).multiplyScalar(0.5);
    B.geo(C.cable, g, m.x, m.y, m.z, { rx: e.x, ry: e.y, rz: e.z, stroke: 0, cast: false });
  };
  stay(x + 0.5, 7.7, z, x + 3.15, 0.75, z);
  stay(x + 0.5, 7.7, z, x - 2.9, 0.75, z);
  stay(x + 0.5, 7.2, z, x + 0.4, 0.72, z + 0.95);
  stay(x + 0.5, 7.2, z, x + 0.4, 0.72, z - 0.95);
}

function buildHome(B, glow, x, z, wallCol, roofCol) {
  B.box(C.steel, 5.2, 0.42, 2.2, x, 0.12, z, { r: 0.04, stroke: 0.0024 });
  B.box(C.dock, 5.1, 0.05, 2.1, x, 0.35, z, { stroke: 0.001 });
  B.box(wallCol, 3.7, 1.95, 1.6, x + 0.3, 1.35, z, { r: 0.03, stroke: 0.0026 });
  const s = new THREE.Shape();
  s.moveTo(-1.05, 0); s.lineTo(1.05, 0); s.lineTo(0, 0.85); s.closePath();
  const gable = new THREE.ExtrudeGeometry(s, { depth: 4.1, bevelEnabled: false });
  B.geo(roofCol, gable, x + 2.35, 2.32, z, { ry: -Math.PI / 2, stroke: 0.0026 });
  for (const dx of [-1.0, 0.1, 1.2]) {
    B.box(C.frame, 0.72, 0.84, 0.05, x + dx + 0.3, 1.45, z + 0.81, { stroke: 0 });
    glow.box(C.glow, 0.62, 0.74, 0.02, x + dx + 0.3, 1.45, z + 0.84, { stroke: 0, cast: false });
    B.box(C.frame, 0.03, 0.74, 0.03, x + dx + 0.3, 1.45, z + 0.86, { stroke: 0 });
  }
  for (const dx of [-2.35, -1.2]) B.cyl(C.cedarDark, 0.15, 0.3, x + dx, 0.53, z + 0.5, { rt: 0.2, n: 9, stroke: 0.001 });
  B.geo(C.pineLight, new THREE.ConeGeometry(0.2, 0.66, 8), x - 2.35, 1.0, z + 0.5, { stroke: 0.001 });
  B.geo(C.grass, new THREE.IcosahedronGeometry(0.22, 0), x - 1.2, 0.84, z + 0.5, { stroke: 0.001 });
}

function buildBank(B) {
  const z0 = SLAB.zBack, z1 = -21.9, mid = (z0 + z1) / 2, d = z1 - z0;
  B.box(C.bank, SLAB_W, 0.58, d, SLAB_X, 0.08, mid, { stroke: 0.0022 });
  B.box(C.grass, SLAB_W, 0.13, d - 0.3, SLAB_X, 0.42, mid - 0.15, { stroke: 0.0012 });
  for (let i = 0; i < Math.ceil(SLAB_W); i++) {
    const x = SLAB.x0 + 0.4 + i + hash(i + 2) * 0.6, s = 0.18 + hash(i + 8) * 0.22;
    if (x > 20 && x < 22.1) continue; // keep the entrance clear
    B.geo(i % 2 ? C.rock : C.rockDark, new THREE.DodecahedronGeometry(s), x, 0.12, z1 + 0.03, { ry: i, rx: i * 0.5, sy: 0.7, stroke: 0.0012 });
  }
  [[-16.4, 1.1], [-15.0, 1.2], [-13.6, 1.1], [-11.5, 0.9], [-8.8, 1.2], [-6.9, 0.95], [-2.7, 1.3], [-0.6, 1.0], [3.2, 1.4], [5.5, 1.05], [12.2, 1.25], [14.4, 0.95], [16.6, 1.35], [18.9, 1.0], [23.8, 1.1], [26.1, 1.3], [28.2, 0.95], [30.8, 1.2]].forEach(([x, s], i) => {
    pine(B, x, -22.75 + (i % 2) * 0.28, s, 0.46);
  });
}

export function softDisc() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.45, 'rgba(255,255,255,.45)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export function buildEnvironment(scene, kit, look) {
  const env = new THREE.Group();
  scene.add(env);
  const B = kit.batch(env);
  const glowBatch = kit.batch(env);

  B.box(C.base, SLAB_W, 1.0, SLAB_D, SLAB_X, -0.62, SLAB_C, { r: 0.05, stroke: 0.004 });
  B.box(C.baseLight, SLAB_W + 0.01, 0.1, SLAB_D + 0.01, SLAB_X, -0.2, SLAB_C, { stroke: 0 });
  B.box(C.water, SLAB_W, 0.16, SLAB_D, SLAB_X, -0.08, SLAB_C, { stroke: 0.0016 });

  buildBank(B);
  buildDock(B);
  buildSailboat(B);
  [[-11.5, '#5f7590', '#9c4a3e'], [-3.5, '#d9d9d2', '#8b8f8c'], [3.2, '#a8574a', '#a8a493'], [14.9, '#d8bd72', '#6f7471']].forEach(([x, wall, roof]) => {
    buildHome(B, glowBatch, x, -20.25, wall, roof);
    // White porch rail and a boarding step on each floating home.
    B.box(C.white, 5.0, 0.05, 0.05, x, 1.02, -19.22, { stroke: 0.0007 });
    for (let k = 0; k < 8; k++) B.box(C.white, 0.04, 0.66, 0.04, x - 2.45 + k * 0.7, 0.68, -19.22, { stroke: 0.0005 });
  });

  // Orange marker buoy in the channel.
  B.geo(C.ring, new THREE.SphereGeometry(0.32, 14, 10), -9.2, 0.14, -0.9, { sy: 0.85, stroke: 0.0018 });
  B.cyl(C.white, 0.05, 0.3, -9.2, 0.5, -0.9, { n: 8, stroke: 0.001 });
  B.commit();
  glowBatch.commit();

  // Flat water marks: drifting ripples and the sunset laid across the river.
  const ripples = [];
  const stripGeo = new THREE.PlaneGeometry(1, 1);
  stripGeo.rotateX(-Math.PI / 2);
  const mats = {
    ripple: look.flat(C.ripple, { transparent: true, opacity: 0.8, depthWrite: false }),
    peach: look.flat(C.peach, { transparent: true, opacity: 0.85, depthWrite: false }),
    rose: look.flat(C.rose, { transparent: true, opacity: 0.68, depthWrite: false }),
    deep: look.flat(C.waterDeep, { transparent: true, opacity: 0.7, depthWrite: false }),
  };
  for (let i = 0; i < 640; i++) {
    const x = SLAB.x0 + 0.8 + hash(i + 1) * (SLAB_W - 1.6);
    const z = -21.5 + hash(i + 40) * (SLAB.zFront + 21.2);
    if (z > -5.2 && z < -2.6 && x < 7) continue;
    if (x > -6.8 && z > -14.3 && z < -5) continue;
    if (x > 16.7 && x < 21.8 && z > -5.1 && z < 1.6) continue;
    if (z < -19.1 && z > -21.4 && [-11.5, -3.5, 3.2, 14.9].some((h) => Math.abs(x - h) < 2.7)) continue;
    // The sunset path runs diagonally toward the hero corner.
    const inPath = Math.abs(x - (-9.6 + (5 - z) * 0.45)) < 2.7 && z > -2;
    const kind = inPath ? (i % 3 ? 'peach' : 'rose') : i % 4 === 0 ? 'deep' : 'ripple';
    const m = new THREE.Mesh(stripGeo, mats[kind]);
    const len = (inPath ? 0.8 : 0.45) + hash(i + 70) * 1.5;
    m.scale.set(len, 1, kind === 'deep' ? 0.11 : 0.055);
    m.position.set(x, 0.006 + (i % 5) * 0.0008, z);
    m.renderOrder = 1;
    env.add(m);
    ripples.push({ m, x, phase: hash(i + 9) * Math.PI * 2, amp: 0.1 + hash(i + 11) * 0.2 });
  }

  // Warm window light on the water beside the sauna.
  const disc = softDisc();
  const poolMat = look.flat('#ffbe78', { map: disc, transparent: true, opacity: 0.4, depthWrite: false });
  const pools = [[-1.8, 3.65, 5.2, 1.9], [-7.0, 0.1, 1.7, 3.6]].map(([x, z, sx, sz]) => {
    const p = new THREE.Mesh(stripGeo, poolMat);
    p.scale.set(sx, 1, sz);
    p.position.set(x, 0.012, z);
    p.renderOrder = 2;
    env.add(p);
    return p;
  });

  // The setting sun's reflection: a soft glow and glittering bands running toward the viewer.
  const reflection = new THREE.Mesh(stripGeo, look.flat('#ffae62', { map: disc, transparent: true, opacity: 0, depthWrite: false }));
  reflection.scale.set(6.6, 1, 15);
  reflection.rotation.y = -0.42;
  reflection.position.set(-9.7, 0.009, 5.2);
  reflection.renderOrder = 1;
  env.add(reflection);
  const glitter = ['#fff0a8', '#ffc65f', '#ff8a5f', '#ff6f8e'].map((color, tone) => {
    const parts = [];
    for (let i = 0; i < 58; i++) {
      const n = i * 4 + tone;
      const pz = -1.2 + hash(n + 301) * 12.8;
      const spread = 0.55 + (pz + 1.2) * (0.08 + tone * 0.03);
      const px = -9.6 + (5 - pz) * 0.45 + (hash(n + 411) - 0.5) * 2 * spread;
      if (px < SLAB.x0 + 0.9) continue;
      const g = stripGeo.clone();
      g.scale(0.42 + hash(n + 521) * (1.15 + pz * 0.08), 1, 0.055 + hash(n + 631) * 0.06);
      g.translate(px, 0.012 + tone * 0.0006, pz);
      parts.push(g);
    }
    const m = new THREE.Mesh(mergeGeometries(parts), look.flat(color, { transparent: true, opacity: 0, depthWrite: false }));
    m.renderOrder = 2;
    env.add(m);
    return { m, tone };
  });
  let sunPath = 1;
  let poolGain = 1;
  return {
    setTime(v) {
      mats.ripple.color.copy(v.ripple);
      mats.peach.color.copy(v.pathA);
      mats.rose.color.copy(v.pathB);
      mats.deep.color.copy(v.deep);
      poolGain = v.pool;
      sunPath = v.sunPath;
      reflection.visible = sunPath > 0.01;
      for (const g of glitter) g.m.visible = sunPath > 0.01;
      for (const p of pools) p.visible = poolGain > 0.01;
    },
    update(t) {
      if (sunPath > 0.01) {
        const w = Math.PI / 12;
        reflection.material.opacity = sunPath * (0.5 + Math.sin(t * w * 4) * 0.035);
        for (const g of glitter) {
          g.m.position.x = Math.sin(t * w * (2 + g.tone) + g.tone * 1.7) * 0.2;
          g.m.material.opacity = sunPath * (0.72 + Math.sin(t * w * (7 + g.tone * 2) + g.tone) * 0.24);
        }
      }
      for (const r of ripples) r.m.position.x = r.x + Math.sin(t * (Math.PI / 12) + r.phase) * r.amp;
      poolMat.opacity = Math.min(0.85, (0.37 + Math.sin(t * (Math.PI / 12) * 6) * 0.025) * poolGain);
    },
  };
}
