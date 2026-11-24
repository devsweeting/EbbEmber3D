// The floating sauna. Proportions are estimated from public photos (see DESIGN.md).
// +z is the river side, -z the dock side, -x the porch with the big end window.
import * as THREE from 'three';
import { C } from './kit.js';

export const DECK = 0.56;
const CAB = { x0: -3.8, x1: 3.8, z: 1.6, h: 2.5 };
const ROOF = { x0: -5.9, x1: 4.6, z: 2.45, y: DECK + 2.62, t: 0.26 };
// The stair is on the end facing the swim area, climbing from the dock side
// toward the river side, up to a small landing beside the roof.
export const STAIR = { x0: 4.66, x1: 5.26, top: 0.95, foot: -1.95 };
export const DIVE = { x0: -5.0, x1: -3.3 };
const FLUE = { x: -3.1, z: -1.88, r: 0.13 };

function signTexture() {
  const c = document.createElement('canvas');
  c.width = 1280; c.height = 360;
  const g = c.getContext('2d');
  g.fillStyle = '#e8efe9';
  g.strokeStyle = '#e8efe9';
  g.lineWidth = 9;
  // Hand-drawn from the sign photos: a drop holding a curled flame, over ripples.
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(170, 18);
  g.bezierCurveTo(205, 92, 268, 142, 252, 200);
  g.bezierCurveTo(240, 246, 100, 246, 88, 200);
  g.bezierCurveTo(72, 142, 135, 92, 170, 18);
  g.stroke();
  g.lineWidth = 8;
  g.beginPath();
  g.moveTo(182, 78);
  g.bezierCurveTo(232, 136, 222, 208, 170, 218);
  g.bezierCurveTo(124, 216, 112, 170, 146, 136);
  g.bezierCurveTo(144, 172, 168, 176, 176, 150);
  g.bezierCurveTo(182, 126, 176, 104, 182, 78);
  g.stroke();
  g.beginPath();
  g.moveTo(170, 214);
  g.bezierCurveTo(146, 196, 156, 174, 176, 168);
  g.bezierCurveTo(196, 180, 194, 202, 170, 214);
  g.fill();
  g.lineWidth = 9;
  g.beginPath();
  g.ellipse(170, 262, 128, 22, 0, 0.2 * Math.PI, 0.8 * Math.PI);
  g.stroke();
  g.beginPath();
  g.ellipse(170, 252, 158, 48, 0, 0.12 * Math.PI, 0.88 * Math.PI);
  g.stroke();
  g.beginPath();
  g.ellipse(170, 250, 150, 30, 0, 1.08 * Math.PI, 1.92 * Math.PI);
  g.stroke();
  g.textBaseline = 'middle';
  g.font = '700 112px Optima, "Avenir Next", "Helvetica Neue", Arial, sans-serif';
  g.fillText('EBB & EMBER', 345, 130);
  g.font = '600 62px Optima, "Avenir Next", "Helvetica Neue", Arial, sans-serif';
  g.fillText('FLOATING SAUNAS', 352, 252);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function spans(center, openings, h) {
  const hit = openings.find((o) => center > o.a && center < o.b);
  if (!hit) return [[0, h]];
  const out = [];
  if (hit.y0 > 0) out.push([0, hit.y0]);
  if (hit.y1 < h) out.push([hit.y1, h]);
  return out;
}

function wall(B, { axis, fixed, a0, a1, h, openings = [], color, batten, t = 0.1, out = 1, board = 0.26 }) {
  const put = (col, u, y0, y1, w, off, depth) => {
    const y = DECK + (y0 + y1) / 2;
    const stroke = col === batten ? 0 : 0.0012;
    if (axis === 'x') B.box(col, w, y1 - y0, depth, u, y, fixed + off, { stroke });
    else B.box(col, depth, y1 - y0, w, fixed + off, y, u, { stroke });
  };
  for (let start = a0; start < a1 - 1e-3; start += board) {
    const w = Math.min(board, a1 - start);
    const c = start + w / 2;
    for (const [y0, y1] of spans(c, openings, h)) {
      const shade = color === C.black && Math.round((c + 20) / board) % 3 === 0 ? C.char : color;
      put(shade, c, y0, y1, w - 0.006, 0, t);
      if (batten) put(batten, start + 0.02, y0, y1, 0.04, out * (t / 2 + 0.012), 0.024);
    }
  }
}

function windowUnit(B, glass, glassMat, { axis, fixed, a, b, y0, y1 }) {
  const w = b - a, h = y1 - y0, mid = (a + b) / 2, yc = DECK + (y0 + y1) / 2;
  const f = 0.07;
  const piece = (u, y, pw, ph) => {
    if (axis === 'x') B.box(C.frame, pw, ph, 0.14, u, y, fixed, { stroke: 0.0014 });
    else B.box(C.frame, 0.14, ph, pw, fixed, y, u, { stroke: 0.0014 });
  };
  piece(mid, DECK + y0 + f / 2, w, f);
  piece(mid, DECK + y1 - f / 2, w, f);
  piece(a + f / 2, yc, f, h);
  piece(b - f / 2, yc, f, h);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(w - f * 2, h - f * 2), glassMat);
  pane.position.set(axis === 'x' ? mid : fixed, yc, axis === 'x' ? fixed : mid);
  if (axis === 'z') pane.rotation.y = Math.PI / 2;
  pane.renderOrder = 3;
  glass.add(pane);
}

function rail(B, { axis, fixed, a0, a1, y, h = 1.05, step = 1.5 }) {
  const len = a1 - a0, mid = (a0 + a1) / 2;
  const place = (fn, u, py, ...rest) => (axis === 'x' ? fn(u, py, fixed, ...rest) : fn(fixed, py, u, ...rest));
  const n = Math.max(1, Math.round(len / step));
  for (let i = 0; i <= n; i++) {
    const u = a0 + (len * i) / n;
    place((px, py, pz) => B.box(C.galv, 0.09, h, 0.09, px, py, pz, { stroke: 0.0014 }), u, y + h / 2);
  }
  const span = (col, py, thick, depth, stroke) => {
    if (axis === 'x') B.box(col, len, thick, depth, mid, py, fixed, { stroke });
    else B.box(col, depth, thick, len, fixed, py, mid, { stroke });
  };
  span(C.cedarLight, y + h + 0.03, 0.06, 0.15, 0.0016);
  span(C.led, y + h - 0.012, 0.022, 0.05, 0);
  for (let i = 1; i <= 6; i++) span(C.cable, y + (h * i) / 7, 0.022, 0.022, 0);
}

function buildBench(B, x0, x1, z, y, depth) {
  const len = x1 - x0, mid = (x0 + x1) / 2;
  for (let i = 0; i < 4; i++) {
    B.box(i % 2 ? C.cedarLight : C.cedar, len, 0.04, depth / 4 - 0.015, mid, DECK + y, z - depth / 2 + (depth * (i + 0.5)) / 4, { stroke: 0.0008 });
  }
  for (let x = x0 + 0.08; x <= x1; x += 1.2) {
    B.box(C.cedarDark, 0.07, y, depth - 0.06, x, DECK + y / 2, z, { stroke: 0.0008 });
  }
  B.box(C.cedarDark, len, y - 0.05, 0.03, mid, DECK + (y - 0.05) / 2, z + depth / 2 - 0.03, { stroke: 0.0008 });
}

function buildInterior(B) {
  B.box(C.cedarDark, CAB.x1 - CAB.x0 - 0.1, 0.05, CAB.z * 2 - 0.1, 0, DECK + 0.025, 0, { stroke: 0 });
  for (let z = -1.4; z < 1.5; z += 0.32) {
    B.box(C.cedarDeep, 7.45, 0.008, 0.015, 0, DECK + 0.054, z, { stroke: 0, cast: false });
  }
  // Tiered L-shaped benches: along the dock wall, then wrapping up the partition.
  buildBench(B, -2.5, 1.53, -1.17, 0.92, 0.72);
  buildBench(B, -2.5, 0.81, -0.56, 0.47, 0.5);
  const benchZ = (x0, x1, z0, z1, y) => {
    const depth = x1 - x0, len = z1 - z0, midX = (x0 + x1) / 2, midZ = (z0 + z1) / 2;
    for (let i = 0; i < 4; i++) {
      B.box(i % 2 ? C.cedarLight : C.cedar, depth / 4 - 0.015, 0.04, len, x0 + (depth * (i + 0.5)) / 4, DECK + y, midZ, { stroke: 0.0008 });
    }
    for (let z = z0 + 0.08; z <= z1; z += 0.62) B.box(C.cedarDark, depth - 0.06, y, 0.07, midX, DECK + y / 2, z, { stroke: 0.0008 });
    B.box(C.cedarDark, 0.03, y - 0.05, len, x0 + 0.03, DECK + (y - 0.05) / 2, midZ, { stroke: 0.0008 });
    B.box(C.cedarDark, depth, y - 0.05, 0.03, midX, DECK + (y - 0.05) / 2, z1 - 0.015, { stroke: 0.0008 });
  };
  benchZ(0.81, 1.53, -0.81, 0.62, 0.92);
  benchZ(0.31, 0.81, -0.31, 0.62, 0.47);
  B.box(C.led, 3.3, 0.018, 0.02, -0.85, DECK + 0.42, -0.31, { stroke: 0, cast: false });
  B.box(C.led, 3.3, 0.018, 0.02, -0.85, DECK + 0.87, -0.8, { stroke: 0, cast: false });
  B.box(C.led, 0.02, 0.018, 1.42, 0.8, DECK + 0.87, -0.1, { stroke: 0, cast: false });
  B.box(C.led, 0.02, 0.018, 0.92, 0.3, DECK + 0.42, 0.16, { stroke: 0, cast: false });
  B.box(C.led, 5.2, 0.02, 0.02, -1.15, DECK + 2.34, -1.5, { stroke: 0, cast: false });
  // Backrests along both legs of the L.
  for (let i = 0; i < 3; i++) {
    B.box(C.cedarLight, 3.95, 0.07, 0.03, -0.525, DECK + 1.3 + i * 0.13, -1.47, { stroke: 0.0007 });
    B.box(C.cedarLight, 0.03, 0.07, 2.08, 1.5, DECK + 1.3 + i * 0.13, -0.42, { stroke: 0.0007 });
  }

  // Stove, guard and rocks.
  const sx = FLUE.x, sz = -1.05;
  B.box(C.steel, 0.62, 0.78, 0.62, sx, DECK + 0.44, sz, { r: 0.03 });
  B.box(C.ember, 0.24, 0.16, 0.012, sx, DECK + 0.3, sz + 0.315, { stroke: 0, cast: false });
  B.box(C.frame, 0.3, 0.03, 0.03, sx, DECK + 0.45, sz + 0.32, { stroke: 0 });
  B.box(C.steelLight, 0.7, 0.05, 0.7, sx, DECK + 0.85, sz, { stroke: 0.001 });
  for (let i = 0; i < 16; i++) {
    const a = i * 2.399, r = 0.05 + 0.26 * Math.sqrt(i / 16);
    const rock = new THREE.DodecahedronGeometry(0.075 + (i % 3) * 0.012);
    B.geo(i % 2 ? C.rock : C.rockDark, rock, sx + Math.cos(a) * r, DECK + 0.93 + (i % 4) * 0.025, sz + Math.sin(a) * r, { ry: i, rx: i * 0.7, stroke: 0.0008 });
  }
  for (const z of [sz - 0.42, sz + 0.42]) B.box(C.cedarDeep, 0.8, 0.05, 0.03, sx, DECK + 0.58, z, { stroke: 0.0006 });
  B.box(C.cedarDeep, 0.03, 0.05, 0.86, sx + 0.42, DECK + 0.58, sz, { stroke: 0.0006 });
  // Pipe from the stove top, through the wall, to the outside flue.
  B.cyl(C.galv, 0.09, 0.92, sx, DECK + 0.68, (sz + FLUE.z) / 2, { rx: Math.PI / 2, stroke: 0.001 });

  // Water bucket and ladle on the lower bench: the working kit of the room.
  B.cyl(C.cedarDark, 0.11, 0.2, -2.2, DECK + 0.59, -0.55, { rt: 0.13, n: 12, stroke: 0.0008 });
  B.cyl(C.water, 0.115, 0.01, -2.2, DECK + 0.68, -0.55, { n: 12, stroke: 0 });
  B.box(C.cedarDeep, 0.03, 0.03, 0.34, -2.13, DECK + 0.73, -0.45, { rx: -0.45, stroke: 0.0006 });

  // Changing room beyond the partition (layout assumed).
  B.box(C.cedarLight, 1.35, 0.05, 0.42, 2.97, DECK + 0.46, 1.33, { stroke: 0.001 });
  for (const x of [2.36, 3.56]) B.box(C.cedarDark, 0.06, 0.44, 0.34, x, DECK + 0.22, 1.33, { stroke: 0.0006 });
  B.box(C.cedarDark, 2.0, 0.05, 0.04, 2.65, DECK + 1.72, 1.52, { stroke: 0.0006 });
  [[1.95, C.towel], [2.45, C.suitC], [2.95, C.towel], [3.4, C.navy]].forEach(([x, col]) => {
    B.box(col, 0.32, 0.72, 0.06, x, DECK + 1.34, 1.46, { stroke: 0.0008 });
  });
}

function buildRoof(R) {
  const y = ROOF.y, t = ROOF.t, midY = y + t / 2 - 0.02;
  const piece = (x0, x1, z0, z1) => {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    R.box(C.cedar, w, t - 0.04, d, cx, midY, cz, { stroke: 0.003 });
    R.box(C.membrane, w, 0.05, d, cx, y + t - 0.015, cz, { stroke: 0.0012 });
  };
  const n0 = FLUE.x - 0.3, n1 = FLUE.x + 0.3;
  piece(ROOF.x0, ROOF.x1, -1.7, ROOF.z);
  piece(ROOF.x0, n0, -ROOF.z, -1.7);
  piece(n1, ROOF.x1, -ROOF.z, -1.7);
  // Soffit boards, stepping around the flue notch.
  for (let x = ROOF.x0 + 0.1; x < ROOF.x1; x += 0.3) {
    const inNotch = x > n0 - 0.02 && x < n1 + 0.02;
    const z0 = inNotch ? -1.68 : -ROOF.z + 0.03;
    R.box(C.cedarDark, 0.025, 0.012, ROOF.z - 0.03 - z0, x, y - 0.026, (z0 + ROOF.z - 0.03) / 2, { stroke: 0, cast: false });
  }
  // Membrane speckle.
  for (let i = 0; i < 70; i++) {
    const px = ROOF.x0 + 0.3 + ((i * 0.6180339) % 1) * 9.9;
    const pz = -1.5 + ((i * 0.7548776) % 1) * 3.7;
    R.box(i % 2 ? '#94979a' : '#6c6f73', 0.07, 0.006, 0.05, px, y + t + 0.012, pz, { stroke: 0, cast: false });
  }
  const top = y + t + 0.01;
  // River rail stops at the open dive edge.
  rail(R, { axis: 'x', fixed: ROOF.z - 0.07, a0: ROOF.x0 + 0.06, a1: DIVE.x0, y: top, step: 1.75 });
  rail(R, { axis: 'x', fixed: ROOF.z - 0.07, a0: DIVE.x1, a1: ROOF.x1 - 0.06, y: top, step: 1.75 });
  R.box(C.cedarLight, DIVE.x1 - DIVE.x0, 0.03, 0.22, (DIVE.x0 + DIVE.x1) / 2, top + 0.005, ROOF.z - 0.12, { stroke: 0.0008 });
  rail(R, { axis: 'x', fixed: -ROOF.z + 0.07, a0: ROOF.x0 + 0.06, a1: ROOF.x1 - 0.06, y: top, step: 1.75 });
  // Full rail along the far end, opposite the stairs.
  rail(R, { axis: 'z', fixed: ROOF.x0 + 0.06, a0: -ROOF.z + 0.07, a1: ROOF.z - 0.07, y: top, step: 1.6 });
  // End rail, with a gap onto the stair landing.
  rail(R, { axis: 'z', fixed: ROOF.x1 - 0.06, a0: -ROOF.z + 0.07, a1: 0.93, y: top, step: 1.6 });
  rail(R, { axis: 'z', fixed: ROOF.x1 - 0.06, a0: 1.92, a1: ROOF.z - 0.07, y: top, step: 1 });
  // Black sling loungers on the roof.
  [[-1.1, 1.0], [0.7, 1.0]].forEach(([x, z]) => {
    for (const sgn of [-1, 1]) {
      R.box(C.steel, 0.035, 0.035, 1.72, x + sgn * 0.33, top + 0.05, z, { stroke: 0.0006 });
      R.box(C.steel, 0.03, 0.3, 0.03, x + sgn * 0.33, top + 0.15, z - 0.72, { stroke: 0 });
      R.box(C.steel, 0.03, 0.3, 0.03, x + sgn * 0.33, top + 0.15, z + 0.28, { stroke: 0 });
    }
    R.box(C.frame, 0.64, 0.03, 1.14, x, top + 0.3, z - 0.2, { stroke: 0.0008 });
    R.box(C.frame, 0.64, 0.8, 0.03, x, top + 0.66, z + 0.62, { rx: 0.42, stroke: 0.0008 });
    for (const sgn of [-1, 1]) R.box(C.steel, 0.035, 0.84, 0.035, x + sgn * 0.33, top + 0.66, z + 0.62, { rx: 0.42, stroke: 0.0006 });
  });
}

export function buildSauna(kit, look) {
  const group = new THREE.Group();
  const roof = new THREE.Group();
  const glass = new THREE.Group();
  group.add(roof, glass);
  const S = kit.batch(group);
  const R = kit.batch(roof);

  // Float and its side plates.
  S.box(C.steel, 12.1, 0.62, 5.3, 0, 0.16, 0, { r: 0.05, stroke: 0.0034 });
  for (const z of [2.66, -2.66]) {
    for (const x of [-3.9, 0, 3.9]) S.box(C.steelLight, 3.5, 0.045, 0.02, x, 0.33, z, { stroke: 0 });
  }
  for (const x of [6.06, -6.06]) S.box(C.steelLight, 0.02, 0.045, 4.4, x, 0.33, 0, { stroke: 0 });
  S.box('#e9b45a', 0.42, 0.11, 0.02, -5.5, 0.34, 2.665, { stroke: 0 });

  // Cedar deck boards, run lengthwise with staggered joints.
  for (let row = 0; row < 37; row++) {
    const z = -2.59 + row * 0.144;
    let x = -6;
    let k = row * 3;
    while (x < 6) {
      const len = Math.min(6 - x, 1.7 + ((k * 0.618 + row * 0.37) % 1) * 2.1);
      S.box(C.cedar, len - 0.012, 0.07, 0.132, x + len / 2, DECK - 0.035, z, { stroke: 0.0006 });
      x += len;
      k++;
    }
  }

  // Cabin walls with real openings.
  // Glass wraps the whole sauna room on the river wall and the porch end.
  const riverWin = [{ a: -3.72, b: -1.97, y0: 0.3, y1: 2.32 }, { a: -1.97, b: -0.22, y0: 0.3, y1: 2.32 }, { a: -0.22, b: 1.53, y0: 0.3, y1: 2.32 }];
  const dockOpen = [{ a: 2.55, b: 3.45, y0: 0, y1: 2.12 }, { a: FLUE.x - 0.13, b: FLUE.x + 0.13, y0: 0.52, y1: 0.84 }];
  const endWin = [{ a: -1.53, b: 0, y0: 0.3, y1: 2.32 }, { a: 0, b: 1.53, y0: 0.3, y1: 2.32 }];
  const runs = [
    { axis: 'x', fixed: CAB.z, a0: CAB.x0, a1: CAB.x1, openings: riverWin, out: 1 },
    { axis: 'x', fixed: -CAB.z, a0: CAB.x0, a1: CAB.x1, openings: dockOpen, out: -1 },
    { axis: 'z', fixed: CAB.x0, a0: -CAB.z, a1: CAB.z, openings: endWin, out: -1 },
    { axis: 'z', fixed: CAB.x1, a0: -CAB.z, a1: CAB.z, openings: [], out: 1 },
  ];
  for (const r of runs) {
    wall(S, { ...r, h: CAB.h, color: C.black, batten: C.batten });
    wall(S, { ...r, fixed: r.fixed - r.out * 0.075, h: CAB.h, color: C.cedarPale, t: 0.04 });
  }
  wall(S, { axis: 'z', fixed: 1.6, a0: -CAB.z, a1: CAB.z, h: CAB.h, color: C.cedarLight, t: 0.08, openings: [{ a: 0.7, b: 1.53, y0: 0, y1: 2.05 }] });
  // Sauna door, pushed into the river-side corner of the partition.
  S.box(C.cedarDark, 0.12, 0.08, 0.9, 1.6, DECK + 2.09, 1.12, { stroke: 0.0008 });
  for (const z of [0.72, 1.51]) S.box(C.cedarDark, 0.12, 2.05, 0.05, 1.6, DECK + 1.03, z, { stroke: 0.0008 });
  // Corner trims and a warm top reveal.
  for (const [x, z] of [[CAB.x0, CAB.z], [CAB.x1, CAB.z], [CAB.x0, -CAB.z], [CAB.x1, -CAB.z]]) {
    S.box(C.frame, 0.15, CAB.h, 0.15, x, DECK + CAB.h / 2, z, { stroke: 0.002 });
  }
  S.box(C.led, 7.5, 0.03, 0.02, 0, DECK + CAB.h - 0.04, CAB.z + 0.07, { stroke: 0 });
  S.box(C.led, 7.5, 0.03, 0.02, 0, DECK + CAB.h - 0.04, -CAB.z - 0.07, { stroke: 0 });

  const glassMat = look.flat('#ffd9a0', { transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false });
  for (const o of riverWin) windowUnit(S, glass, glassMat, { axis: 'x', fixed: CAB.z, ...o });
  for (const o of endWin) windowUnit(S, glass, glassMat, { axis: 'z', fixed: CAB.x0, ...o });
  // Cedar-framed glass door on the dock wall.
  const dz = -CAB.z - 0.04;
  S.box(C.cedarLight, 0.9, 0.13, 0.08, 3.0, DECK + 2.06, dz, { stroke: 0.0012 });
  S.box(C.cedarLight, 0.9, 0.2, 0.08, 3.0, DECK + 0.1, dz, { stroke: 0.0012 });
  for (const x of [2.61, 3.39]) S.box(C.cedarLight, 0.13, 2.1, 0.08, x, DECK + 1.05, dz, { stroke: 0.0012 });
  S.box('#46565c', 0.66, 1.74, 0.025, 3.0, DECK + 1.1, dz, { stroke: 0.0006 });
  S.box(C.frame, 0.05, 0.22, 0.05, 3.39, DECK + 1.05, dz - 0.07, { stroke: 0 });
  S.box(C.frame, 0.09, 0.12, 0.02, 3.39, DECK + 1.3, dz - 0.05, { stroke: 0 });

  buildInterior(S);

  // Exterior flue with bracket and cap.
  const flueTop = ROOF.y + ROOF.t + 0.9;
  S.cyl(C.galv, FLUE.r + 0.025, flueTop - (DECK + 0.55), FLUE.x, (flueTop + DECK + 0.55) / 2, FLUE.z, { n: 14, stroke: 0.0022 });
  S.cyl(C.steelLight, FLUE.r + 0.05, 0.06, FLUE.x, DECK + 0.55, FLUE.z, { n: 14, stroke: 0.001 });
  S.cyl(C.steelLight, FLUE.r + 0.04, 0.05, FLUE.x, DECK + 2.1, FLUE.z, { n: 14, stroke: 0.0008 });
  S.box(C.galv, 0.34, 0.42, 0.02, FLUE.x + 0.42, DECK + 0.42, -CAB.z - 0.07, { stroke: 0.0008 });
  for (let i = 0; i < 6; i++) S.box(C.frame, 0.28, 0.018, 0.006, FLUE.x + 0.42, DECK + 0.27 + i * 0.06, -CAB.z - 0.083, { stroke: 0, cast: false });
  S.cyl(C.galv, FLUE.r + 0.1, 0.11, FLUE.x, flueTop + 0.04, FLUE.z, { rt: FLUE.r + 0.02, n: 14, stroke: 0.0016 });
  S.box(C.frame, 0.05, 0.04, 0.34, FLUE.x, DECK + 2.1, -1.78, { stroke: 0 });

  // Roof posts, carrying the load to the float.
  // Set to the outer edge so the side walkways stay clear; the dock-side middle post clears the flue.
  for (const [x, z] of [[-5.72, 2.38], [-2.9, 2.38], [4.4, 2.38], [-5.72, -2.38], [-1.6, -2.38], [4.4, -2.38]]) {
    S.box(C.galv, 0.13, ROOF.y - DECK, 0.13, x, (ROOF.y + DECK) / 2, z, { stroke: 0.0022 });
  }

  // Deck rails, leaving the dock gate and ladder gap open.
  rail(S, { axis: 'x', fixed: 2.53, a0: -5.92, a1: 5.92, y: DECK });
  rail(S, { axis: 'z', fixed: 5.92, a0: -2.53, a1: 2.53, y: DECK });
  rail(S, { axis: 'z', fixed: -5.92, a0: -2.53, a1: 1.0, y: DECK });
  rail(S, { axis: 'z', fixed: -5.92, a0: 1.8, a1: 2.53, y: DECK, step: 1 });

  // River ladder, running below the waterline.
  for (const z of [1.2, 1.6]) {
    S.cyl(C.galv, 0.03, 2.3, -6.1, 0.05, z, { n: 8, stroke: 0.0012 });
    S.cyl(C.galv, 0.03, 0.26, -5.98, 1.2, z, { rz: Math.PI / 2, n: 8, stroke: 0.0012 });
    S.cyl(C.galv, 0.03, 0.2, -5.87, 1.11, z, { n: 8, stroke: 0.0012 });
  }
  for (let y = -0.6; y < 0.5; y += 0.28) S.cyl(C.galv, 0.024, 0.4, -6.1, y, 1.4, { rx: Math.PI / 2, n: 6, stroke: 0.001 });

  // Life ring on the river rail.
  S.geo(C.ring, new THREE.TorusGeometry(0.31, 0.085, 10, 28), 4.9, DECK + 0.62, 2.63, { stroke: 0.0014 });
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    S.box(C.white, 0.13, 0.19, 0.19, 4.9 + Math.cos(a) * 0.31, DECK + 0.62 + Math.sin(a) * 0.31, 2.63, { rz: a, stroke: 0 });
  }
  S.box(C.frame, 0.09, 0.08, 0.1, 4.9, DECK + 0.98, 2.58, { stroke: 0 });

  S.geo(C.ring, new THREE.TorusGeometry(0.31, 0.085, 10, 28), -5.98, DECK + 0.62, -1.75, { ry: Math.PI / 2, stroke: 0.0014 });
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    S.box(C.white, 0.19, 0.19, 0.13, -5.98, DECK + 0.62 + Math.sin(a) * 0.31, -1.75 + Math.cos(a) * 0.31, { rx: -a, stroke: 0 });
  }

  // Open stair on the swim-area end, running alongside the end wall.
  const roofTop = ROOF.y + ROOF.t;
  const rise = roofTop - DECK, run = STAIR.foot - STAIR.top, len = Math.hypot(rise, run), ang = -Math.atan2(run, rise);
  const midZ = (STAIR.foot + STAIR.top) / 2, midX = (STAIR.x0 + STAIR.x1) / 2, width = STAIR.x1 - STAIR.x0;
  const nY = (Math.abs(run) / len) * 0.88, nZ = (rise / len) * 0.88 * Math.sign(run);
  for (const x of [STAIR.x0 + 0.03, STAIR.x1 - 0.03]) {
    S.box(C.cedarDark, 0.06, len, 0.2, x, DECK + rise / 2, midZ, { rx: ang, stroke: 0.0012 });
    S.box(C.cedarLight, 0.06, len + 0.1, 0.07, x, DECK + rise / 2 + nY, midZ + nZ, { rx: ang, stroke: 0.001 });
    for (const k of [0.1, 0.5, 0.9]) {
      S.box(C.galv, 0.05, 0.9, 0.05, x, DECK + rise * k + 0.45, STAIR.foot - run * k, { stroke: 0.0008 });
    }
  }
  for (let i = 1; i < 14; i++) {
    const k = i / 14;
    S.box(C.cedarLight, width - 0.08, 0.045, 0.25, midX, DECK + rise * k, STAIR.foot - run * k, { stroke: 0.0008 });
  }
  // Landing beside the roof, carried on its own posts.
  S.box(C.cedar, 0.7, 0.12, 0.87, 4.95, roofTop - 0.06, 1.515, { stroke: 0.0014 });
  for (const [x, z] of [[5.26, 1.12]]) {
    S.box(C.galv, 0.09, rise, 0.09, x, DECK + rise / 2, z, { stroke: 0.0012 });
  }
  rail(S, { axis: 'z', fixed: 5.29, a0: 1.08, a1: 1.93, y: roofTop, step: 1 });
  rail(S, { axis: 'x', fixed: 1.93, a0: 4.62, a1: 5.29, y: roofTop, step: 1 });

  // Porch: left open as the walkway from the ladder; a towel hangs on the river rail.
  S.box(C.towel, 0.62, 0.4, 0.025, -3.2, DECK + 0.9, 2.615, { stroke: 0.0008 });
  S.box(C.towel, 0.62, 0.025, 0.19, -3.2, DECK + 1.105, 2.53, { stroke: 0.0008 });
  S.box(C.towel, 0.62, 0.3, 0.025, -3.2, DECK + 0.96, 2.445, { stroke: 0.0008 });
  for (let i = 0; i < 6; i++) {
    S.box(C.cedarDeep, 0.2, 0.004, 0.09, -5.65 + i * 0.3, DECK + 0.003, 1.42 + (i % 2) * 0.17 + i * 0.09, { ry: 0.25, stroke: 0, cast: false });
  }

  // Mooring cleats on the dock side.
  for (const x of [-5.1, 0.6, 5.2]) S.box(C.frame, 0.32, 0.05, 0.08, x, DECK + 0.03, -2.6, { stroke: 0 });

  // Sign, on both long walls.
  const tex = signTexture();
  const signMat = look.flat(0xffffff, { map: tex, transparent: true, depthWrite: false });
  const signGeo = new THREE.PlaneGeometry(3.2, 0.9);
  const river = new THREE.Mesh(signGeo, signMat);
  river.position.set(2.68, DECK + 1.5, CAB.z + 0.075);
  river.scale.setScalar(0.64);
  const dock = new THREE.Mesh(signGeo, signMat);
  dock.position.set(-1.0, DECK + 1.5, -CAB.z - 0.075);
  dock.rotation.y = Math.PI;
  group.add(river, dock);

  buildRoof(R);
  S.commit();
  R.commit();

  // One real warm light in the steam room; the rest are emissive strips.
  const hearth = new THREE.PointLight(0xffa766, 7, 7, 1.7);
  hearth.position.set(-1.6, DECK + 1.85, 0.2);
  group.add(hearth);
  // Night lighting on the river wall and roof deck; off until the sun goes down.
  const riverLight = new THREE.PointLight(0xffc27d, 0, 10, 1.7);
  riverLight.position.set(-0.8, DECK + 2.1, 3.5);
  const roofLight = new THREE.PointLight(0xffd89c, 0, 9, 1.7);
  roofLight.position.set(-0.6, ROOF.y + 2.0, 0);
  group.add(riverLight, roofLight);

  return {
    group,
    roof,
    flueTop: new THREE.Vector3(FLUE.x, flueTop + 0.1, FLUE.z),
    setTime(v) {
      hearth.intensity = v.hearth;
      riverLight.intensity = v.river;
      roofLight.intensity = v.roof;
      glassMat.color.copy(v.glass);
      glassMat.opacity = v.glassOpacity;
    },
  };
}
