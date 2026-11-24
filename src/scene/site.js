// The dock behind and beside the sauna, laid out from the owner's social photos
// (refs/ebb-ember): pavilion directly behind the sauna, cedar forecourt, the
// Portland Downpour on the pavilion's end wall, and the fenced corner lounge.
// Distances are estimates; bathroom interiors are not modeled.
import * as THREE from 'three';
import { C, clamp, smooth } from './kit.js';
import { softDisc } from './environment.js';

export const DK = 0.35;
export const DECK_AREA = { x0: -6.7, x1: 20.4, z0: -14.1, z1: 1.4 };
export const SWIM = { x0: 6.7, x1: 16.75, z0: -5.0, z1: 1.4 };
// The pavilion's left wall lines up with the sauna float's porch-end edge.
const P = { x0: -6.05, x1: 5.4, z0: -13.6, z1: -8.3, floor: 0.64, h: 4.6 };
// The Downpour's wall stops well short of the front, leaving that side open.
const WALL_END = P.z1 - 2.3;
export const SHOWER = { x: 6.14, z: -11.33 };
const LOUNGE_DZ = -2.3;
const FENCE = { x0: 10.2, x1: 20.05, z0: -11.55 + LOUNGE_DZ, z1: -3.4 + LOUNGE_DZ };

// All deck boards share one cedar color; outlines and joints separate them.
const WEATHERED = [C.cedar];
const NEW_CEDAR = [C.cedar];
const loungeEdge = (x) => -6.15 + LOUNGE_DZ + (x - FENCE.x0) * 0.26;

function boardsZ(B, x0, x1, z0, z1, colors, y = DK, step = 0.24) {
  let i = 0;
  for (let x = x0 + step / 2; x < x1; x += step, i++) {
    const end = typeof z1 === 'function' ? z1(x) : z1;
    const len = end - z0;
    if (len <= 0.02) continue;
    B.box(colors[(i * 5 + (i >> 2)) % colors.length], step - 0.018, 0.05, len, x, y - 0.025, z0 + len / 2, { stroke: 0.0007 });
    B.box(C.cedarDark, step - 0.024, 0.004, 0.018, x, y + 0.002, z0 + ((i * 0.618) % 1) * len, { stroke: 0, cast: false });
  }
}

function boardsX(B, x0, x1, z0, z1, colors, y = DK, step = 0.22) {
  let row = 0;
  for (let z = z0 + step / 2; z < z1; z += step, row++) {
    let x = x0, k = row * 3;
    while (x < x1 - 0.01) {
      const len = Math.min(x1 - x, 2.2 + ((k * 0.618 + row * 0.37) % 1) * 2.4);
      B.box(colors[(k + row) % colors.length], len - 0.014, 0.05, step - 0.016, x + len / 2, y - 0.025, z, { stroke: 0.0007 });
      x += len;
      k++;
    }
  }
}

function buildDeck(B) {
  // Floats under the deck, leaving a square of open water beside the sauna.
  const hull = (x0, x1, z0, z1) => B.box(C.cedarDark, x1 - x0, 0.34, z1 - z0, (x0 + x1) / 2, 0.13, (z0 + z1) / 2, { stroke: 0.0026 });
  hull(-6.7, 6.7, -5.0, -2.74);
  hull(-6.7, 20.4, -14.1, -5.0);
  hull(SWIM.x1, 20.4, -5.0, 1.4);
  // Main entrance: one slim walkway along the outer edge, from the front deck to shore,
  // joined by a path that runs behind the lounge wall.
  hull(20.4, 21.7, -21.85, 1.4);
  hull(8.9, 20.4, -15.4, -14.1);

  // Old grey dock, with its boards running in different directions by section.
  boardsZ(B, -6.7, 6.7, -5.0, -2.74, WEATHERED);
  boardsX(B, -6.7, 10.2, -14.1, -5.0, WEATHERED);
  boardsX(B, 10.2, 20.4, -14.1, -5.0, WEATHERED);
  boardsZ(B, SWIM.x1, 20.4, -5.0, 1.4, WEATHERED);
  boardsX(B, 20.4, 21.7, -21.85, 1.4, WEATHERED);
  boardsZ(B, 8.9, 20.4, -15.4, -14.1, WEATHERED);
  boardsZ(B, FENCE.x0, FENCE.x1, FENCE.z0, loungeEdge, NEW_CEDAR, DK + 0.012, 0.17);
  const ex0 = FENCE.x0, ex1 = FENCE.x1, ez0 = loungeEdge(ex0), ez1 = loungeEdge(ex1);
  const edge = Math.hypot(ex1 - ex0, ez1 - ez0);
  B.box(C.cedar, edge, 0.03, 0.1, (ex0 + ex1) / 2, DK + 0.006, (ez0 + ez1) / 2, { ry: -Math.atan2(ez1 - ez0, ex1 - ex0), stroke: 0.0006 });

  // Curbs on the open-water edges and around the swim square.
  const curbX = (x0, x1, z) => B.box(C.cedar, x1 - x0, 0.09, 0.14, (x0 + x1) / 2, DK + 0.035, z, { stroke: 0.001 });
  const curbZ = (x, z0, z1) => B.box(C.cedar, 0.14, 0.09, z1 - z0, x, DK + 0.035, (z0 + z1) / 2, { stroke: 0.001 });
  curbX(SWIM.x1, 21.7, 1.33);
  curbX(-6.7, 8.9, -14.03);
  curbX(8.9, 20.4, -15.33);
  curbZ(8.97, -15.4, -14.1);
  curbZ(21.63, -21.85, 1.4);
  curbZ(20.47, -21.85, -15.4);
  curbZ(-6.63, -14.1, -2.74);
  curbX(SWIM.x0, SWIM.x1 + 0.07, SWIM.z0 + 0.07);
  curbZ(SWIM.x1 + 0.07, SWIM.z0, SWIM.z1);
  B.box(C.white, 21.7 - SWIM.x1, 0.16, 0.16, (21.7 + SWIM.x1) / 2, 0.22, 1.5, { r: 0.06, stroke: 0.0012 });
  for (const x of [17.7, 19.3, 20.9]) B.cyl(C.white, 0.13, 0.5, x, 0.14, 1.54, { n: 10, stroke: 0.001 });

  // Floating boom closing the river side of the swim square.
  for (let x = SWIM.x0 - 0.1; x < SWIM.x1; x += 0.72) {
    B.cyl(C.white, 0.14, 0.62, x + 0.31, 0.05, SWIM.z1 + 0.02, { rz: Math.PI / 2, n: 10, stroke: 0.0012 });
    B.cyl(C.ring, 0.145, 0.07, x + 0.31, 0.05, SWIM.z1 + 0.02, { rz: Math.PI / 2, n: 10, stroke: 0.0006 });
  }
  B.box(C.frame, SWIM.x1 - SWIM.x0 + 0.3, 0.018, 0.018, (SWIM.x0 + SWIM.x1) / 2, 0.2, SWIM.z1 + 0.02, { stroke: 0, cast: false });

  // Swim ladder on the sauna side of the square, at the first pole by the door and stairs.
  for (const z of [-3.25, -2.85]) {
    B.cyl(C.galv, 0.03, 1.5, SWIM.x0 + 0.1, 0.25, z, { n: 8, stroke: 0.0012 });
    B.cyl(C.galv, 0.03, 0.3, SWIM.x0 - 0.03, 1.0, z, { rz: Math.PI / 2, n: 8, stroke: 0.0012 });
    B.cyl(C.galv, 0.03, 0.66, SWIM.x0 - 0.18, 0.68, z, { n: 8, stroke: 0.0012 });
  }
  for (let y = -0.4; y < 0.4; y += 0.26) B.cyl(C.galv, 0.024, 0.4, SWIM.x0 + 0.1, y, -3.05, { rx: Math.PI / 2, n: 6, stroke: 0.001 });

  // Timber and rust-steel pilings, as they stand around the dock in the photos.
  for (const [x, z, h, col] of [
    [6.42, -2.1, 7.2, C.piling], [6.42, 0.25, 6.2, '#4a3a2f'], [-6.95, -5.5, 6.6, '#4a3a2f'],
    [-6.95, -13.1, 6.0, C.piling], [5.2, -14.45, 8.2, '#9c5a38'], [13.6, -15.65, 6.0, C.piling],
    [22.0, -6.2, 5.6, C.piling],
  ]) {
    B.cyl(col, 0.25, h, x, h / 2 - 0.25, z, { rt: 0.18, n: 9, stroke: 0.0024 });
    B.cyl(C.steelLight, 0.2, 0.08, x, h - 0.22, z, { rt: 0.11, n: 9, stroke: 0.001 });
  }
}

function doorSign(group, look, text, x, y, z) {
  const c = document.createElement('canvas');
  c.width = 320; c.height = 120;
  const g = c.getContext('2d');
  g.fillStyle = '#f3eee3';
  g.fillRect(0, 0, 320, 120);
  g.fillStyle = '#1f2327';
  g.font = '700 46px "Avenir Next", "Helvetica Neue", Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 160, 62);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.21), look.flat(0xffffff, { map: t }));
  (group.userData.signMats ??= []).push(m.material);
  m.position.set(x, y, z);
  m.rotation.y = Math.PI / 2;
  group.add(m);
}

function buildPavilion(B, group, look) {
  const { x0, x1, z0, z1, floor, h } = P;
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  B.box(C.cedarDark, w + 0.1, floor - DK, d + 0.05, cx, (floor + DK) / 2, cz, { stroke: 0.0018 });
  for (let k = 0, z = z0 + 0.11; z < z1; z += 0.22, k++) {
    B.box(C.cedar, w, 0.04, 0.2, cx, floor - 0.018, z, { stroke: 0.0007 });
  }
  // Black fascia under the floor edge and the long cedar step.
  B.box(C.frame, w + 0.12, 0.1, 0.07, cx, floor - 0.11, z1 + 0.04, { stroke: 0.001 });
  // One continuous step along the front and up the open Downpour side.
  B.box(C.cedar, w + 0.75, 0.15, 0.6, cx + 0.225, DK + 0.09, z1 + 0.36, { r: 0.015, stroke: 0.0014 });
  B.box(C.cedar, 0.6, 0.15, z1 + 0.06 - WALL_END, x1 + 0.3, DK + 0.09, (z1 + 0.06 + WALL_END) / 2, { r: 0.015, stroke: 0.0014 });
  B.box(C.frame, 0.07, 0.1, z1 - WALL_END, x1 + 0.04, floor - 0.11, (z1 + WALL_END) / 2, { stroke: 0.001 });

  // Horizontal cedar back wall.
  for (let y = floor + 0.08, k = 0; y < floor + h; y += 0.19, k++) {
    B.box(k % 3 ? C.cedar : C.cedarLight, w, 0.175, 0.08, cx, y, z0 + 0.05, { stroke: 0.0007 });
  }
  // Charred end walls: full depth on the door side, pulled back on the Downpour side.
  for (const [side, stop] of [[x0, z1 - 0.28], [x1, WALL_END]]) {
    for (let z = z0, k = 0; z < stop; z += 0.27, k++) {
      B.box(k % 3 ? C.black : C.char, 0.09, h + 0.28, 0.255, side, floor + (h + 0.28) / 2, z + 0.135, { stroke: 0.0008 });
    }
  }
  // Posts and header.
  for (const x of [x0 + 0.1, cx, x1 - 0.1]) {
    B.box(C.frame, 0.24, h + 0.5, 0.24, x, floor + (h + 0.5) / 2, z1 - 0.12, { stroke: 0.0024 });
  }
  B.box(C.frame, w, 0.26, 0.2, cx, floor + h + 0.42, z1 - 0.12, { stroke: 0.0018 });
  B.box(C.frame, 0.24, h + 0.5, 0.24, x1 - 0.02, floor + (h + 0.5) / 2, WALL_END, { stroke: 0.0022 });
  B.box(C.frame, 0.2, 0.26, z1 - WALL_END, x1 - 0.1, floor + h + 0.42, (z1 + WALL_END) / 2, { stroke: 0.0016 });

  // The session sign on the end wall, beside the Downpour.
  B.box(C.frame, 0.03, 0.72, 0.56, x1 + 0.065, floor + 1.45, WALL_END - 0.62, { stroke: 0.0008 });
  for (let i = 0; i < 3; i++) B.box(C.white, 0.008, 0.025, 0.36, x1 + 0.083, floor + 1.32 + i * 0.09, WALL_END - 0.62, { stroke: 0, cast: false });
  B.box(C.white, 0.008, 0.11, 0.09, x1 + 0.083, floor + 1.66, WALL_END - 0.62, { stroke: 0, cast: false });

  // The bathroom block fills the left end of the pavilion, out to the lockers.
  // Facing its door wall, left to right: bathroom, shower, utility closet.
  const roomX = -2.8, roomFront = z1 - 0.28;
  for (let z = z0, k = 0; z < roomFront; z += 0.27, k++) {
    B.box(k % 3 ? C.black : C.char, 0.09, h + 0.28, Math.min(0.255, roomFront - z), roomX, floor + (h + 0.28) / 2, z + 0.135, { stroke: 0.0008 });
  }
  for (let x = x0, k = 0; x < roomX; x += 0.27, k++) {
    B.box(k % 3 ? C.black : C.char, Math.min(0.255, roomX - x), h + 0.28, 0.09, x + 0.135, floor + (h + 0.28) / 2, roomFront, { stroke: 0.0008 });
  }
  for (const dz of [z1 - 1.72, z1 - 3.17]) B.box(C.cedarDark, roomX - x0, h + 0.28, 0.08, (x0 + roomX) / 2, floor + (h + 0.28) / 2, dz, { stroke: 0.0008 });
  B.box(C.frame, 0.14, h + 0.3, 0.14, roomX, floor + (h + 0.3) / 2, roomFront, { stroke: 0.0018 });
  [[z1 - 1.0, 'BATHROOM'], [z1 - 2.45, 'SHOWER'], [z1 - 3.9, 'UTILITY']].forEach(([dz, label]) => {
    B.box(C.frame, 0.08, 2.25, 1.08, roomX + 0.075, floor + 1.13, dz, { stroke: 0.0016 });
    B.box(C.batten, 0.05, 2.12, 0.92, roomX + 0.125, floor + 1.08, dz, { stroke: 0.0008 });
    B.box(C.galv, 0.05, 0.16, 0.05, roomX + 0.165, floor + 1.03, dz - 0.36, { stroke: 0 });
    doorSign(group, look, label, roomX + 0.156, floor + 1.66, dz);
  });

  // Small lockable 3x3 locker on a cedar stand, on the back wall.
  const lx = cx - 1.82, lz = z0 + 0.32, lw = 0.96, ly = floor + 0.72 + lw / 2;
  B.box(C.cedarDark, lw + 0.08, 0.72, 0.44, lx, floor + 0.36, lz, { stroke: 0.0012 });
  B.box(C.frame, lw, lw, 0.44, lx, ly, lz, { stroke: 0.0016 });
  const cell = (lw - 0.06) / 3;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const dx = lx + (col - 1) * cell, dy = ly + (row - 1) * cell;
      B.box(C.steelLight, cell - 0.025, cell - 0.025, 0.025, dx, dy, lz + 0.232, { stroke: 0.0006 });
      B.cyl(C.galv, 0.024, 0.02, dx + cell * 0.3, dy, lz + 0.252, { rx: Math.PI / 2, n: 10, stroke: 0 });
      B.box(C.frame, 0.006, 0.026, 0.006, dx + cell * 0.3, dy, lz + 0.264, { stroke: 0, cast: false });
      for (let v = 0; v < 3; v++) B.box(C.steel, cell * 0.38, 0.008, 0.005, dx - cell * 0.08, dy + cell * 0.25 + v * 0.025, lz + 0.247, { stroke: 0, cast: false });
    }
  }

  // Wall bench, hooks and robes.
  B.box(C.cedarLight, 3.2, 0.07, 0.48, cx + 2.2, floor + 0.46, z0 + 0.34, { stroke: 0.001 });
  for (const dx of [0.75, 2.2, 3.65]) B.box(C.cedarDark, 0.07, 0.44, 0.42, cx + dx, floor + 0.22, z0 + 0.34, { stroke: 0.0007 });
  B.box(C.cedarDark, 3.2, 0.06, 0.04, cx + 2.2, floor + 1.75, z0 + 0.13, { stroke: 0.0007 });
  [[1.0, C.towel], [1.65, C.navy], [2.3, C.towel], [2.95, C.suitC], [3.5, C.towel]].forEach(([dx, col]) => {
    B.box(col, 0.34, 0.86, 0.07, cx + dx, floor + 1.31, z0 + 0.16, { stroke: 0.0008 });
  });
  // The green cooler, bin and folded wagon from the deck photos.
  B.box('#6f8064', 1.15, 0.5, 0.62, x1 - 2.4, floor + 0.25, z1 - 0.72, { r: 0.04, stroke: 0.0016 });
  B.box('#869878', 1.2, 0.08, 0.66, x1 - 2.4, floor + 0.54, z1 - 0.72, { r: 0.025, stroke: 0.001 });
  B.cyl(C.galv, 0.19, 0.48, x1 - 1.5, floor + 0.24, z1 - 0.75, { rt: 0.22, n: 12, stroke: 0.001 });
  B.box('#2d6f96', 0.42, 0.38, 0.36, x1 - 3.3, floor + 0.19, z1 - 0.7, { r: 0.03, stroke: 0.001 });
  // Stored folding gear in the charred corner.
  for (let i = 0; i < 3; i++) B.box(C.frame, 0.05, 1.0, 0.72, x1 - 0.55 + i * 0.09, floor + 0.5, z0 + 0.72, { rz: 0.12, stroke: 0.0006 });

  const roof = new THREE.Group();
  const span = d + 1.3, ang = Math.atan2(0.42, span);
  roof.position.set(cx, floor + h + 0.72, cz + 0.36);
  roof.rotation.x = -ang;
  group.add(roof);
  return { roof, w, span };
}

function dressRoof(R, w, span) {
  R.box(C.cedar, w + 0.9, 0.16, span, 0, -0.12, 0, { stroke: 0.0012 });
  for (let x = -w / 2 - 0.3; x < w / 2 + 0.4; x += 0.32) {
    R.box(C.cedarDark, 0.02, 0.01, span - 0.08, x, -0.204, 0, { stroke: 0, cast: false });
  }
  R.box('#b76f49', w + 1.0, 0.07, span + 0.1, 0, 0, 0, { stroke: 0.0016 });
  for (let x = -w / 2 - 0.42; x < w / 2 + 0.5; x += 0.46) {
    R.box('#cd8660', 0.035, 0.05, span + 0.1, x, 0.055, 0, { stroke: 0, cast: false });
  }
  for (const sgn of [-1, 1]) {
    R.box(C.frame, w + 1.06, 0.34, 0.08, 0, -0.08, sgn * (span / 2 + 0.06), { stroke: 0.002 });
    R.box(C.frame, 0.08, 0.34, span + 0.18, sgn * (w / 2 + 0.52), -0.08, 0, { stroke: 0.002 });
  }
  R.box('#d8a06f', w + 1.06, 0.035, 0.09, 0, 0.1, span / 2 + 0.06, { stroke: 0, cast: false });
  for (const x of [-3, -1, 1, 3]) R.cyl(C.led, 0.08, 0.012, x, -0.214, span / 2 - 1.3, { n: 12, stroke: 0, cast: false });
}

function buildDownpour(B) {
  const { x, z } = SHOWER, w = 1.2, backZ = z - 0.62, top = DK + 2.72;
  // Thick black tray frame with wide cedar boards.
  B.box(C.frame, w + 0.14, 0.11, 1.42, x, DK + 0.055, z + 0.04, { stroke: 0.0018 });
  for (let i = 0; i < 5; i++) {
    B.box(i % 2 ? C.cedarLight : C.cedar, w - 0.04, 0.035, 0.235, x, DK + 0.122, z - 0.5 + i * 0.25, { stroke: 0.0007 });
  }
  for (let y = DK + 0.2, k = 0; y < top; y += 0.17, k++) {
    B.box(k % 3 ? C.cedar : C.cedarLight, w, 0.155, 0.13, x, y, backZ, { stroke: 0.0007 });
  }
  for (const sgn of [-1, 1]) B.box(C.frame, 0.05, top - DK, 0.16, x + sgn * (w / 2 + 0.02), (top + DK) / 2, backZ, { stroke: 0.001 });
  // Cantilevered head that hides the 60 litre bucket, capped in black.
  for (let y = top + 0.02, k = 0; y < top + 0.62; y += 0.15, k++) {
    B.box(k % 2 ? C.cedar : C.cedarLight, w, 0.14, 1.12, x, y, backZ + 0.5, { stroke: 0.0007 });
  }
  B.box(C.cedarDark, w - 0.06, 0.018, 1.04, x, top + 0.005, backZ + 0.5, { stroke: 0, cast: false });
  B.box(C.frame, w + 0.14, 0.08, 1.24, x, top + 0.68, backZ + 0.5, { stroke: 0.0016 });
  B.cyl(C.frame, 0.15, 0.04, x, top - 0.03, z - 0.04, { n: 16, stroke: 0.0006 });
  B.cyl(C.steelLight, 0.11, 0.012, x, top - 0.055, z - 0.04, { n: 16, stroke: 0, cast: false });
  // Black pull cord down the pavilion side, with its steel clip and handle.
  const cx = x - 0.44, cz = z + 0.02;
  B.box(C.frame, 0.03, 1.28, 0.03, cx, top - 0.64, cz, { stroke: 0 });
  B.box(C.galv, 0.05, 0.1, 0.03, cx, top - 1.33, cz, { stroke: 0 });
  B.cyl(C.frame, 0.03, 0.26, cx, top - 1.5, cz, { n: 8, stroke: 0.0005 });
  // Slippery-when-wet mat by the step.
  B.box(C.frame, 0.56, 0.008, 0.42, x + 0.62, DK + 0.02, z + 1.02, { stroke: 0, cast: false });
  B.box(C.white, 0.34, 0.01, 0.04, x + 0.62, DK + 0.026, z + 0.94, { stroke: 0, cast: false });
  B.box(C.white, 0.26, 0.01, 0.04, x + 0.62, DK + 0.026, z + 1.05, { stroke: 0, cast: false });
}

function fenceRun(B, x0, z0, x1, z1, h = 1.85) {
  const len = Math.hypot(x1 - x0, z1 - z0), alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  for (let y = DK + 0.09, k = 0; y < DK + h; y += 0.158, k++) {
    const col = k % 4 === 0 ? C.cedarLight : k % 3 === 0 ? C.cedarDark : C.cedar;
    if (alongX) B.box(col, len, 0.14, 0.05, cx, y, cz, { stroke: 0.0006 });
    else B.box(col, 0.05, 0.14, len, cx, y, cz, { stroke: 0.0006 });
  }
  const n = Math.max(1, Math.round(len / 2.5));
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    B.box(C.frame, 0.13, h + 0.08, 0.13, x0 + (x1 - x0) * k, DK + (h + 0.08) / 2, z0 + (z1 - z0) * k, { stroke: 0.0014 });
  }
  if (alongX) B.box(C.frame, len, 0.05, 0.1, cx, DK + h + 0.05, cz, { stroke: 0.0007 });
  else B.box(C.frame, 0.1, 0.05, len, cx, DK + h + 0.05, cz, { stroke: 0.0007 });
}

function planter(B, x, z, s, kind) {
  const base = DK + 0.012;
  const potCol = kind === 'grass' ? '#c9c6b8' : C.frame;
  B.cyl(potCol, 0.2 * s, 0.46 * s, x, base + 0.23 * s, z, { rt: 0.26 * s, n: 12, stroke: 0.0012 });
  B.cyl(C.trunk, 0.245 * s, 0.02, x, base + 0.45 * s, z, { n: 12, stroke: 0, cast: false });
  if (kind === 'bush' || kind === 'vine') {
    const rows = kind === 'vine' ? 11 : 6;
    for (let i = 0; i < rows; i++) {
      const a = i * 2.4, r = (kind === 'vine' ? 0.08 : 0.13) * s;
      const y = kind === 'vine' ? 0.62 + i * 0.16 : 0.66 + (i % 3) * 0.1;
      B.geo(i % 2 ? C.pineLight : C.grass, new THREE.IcosahedronGeometry((kind === 'vine' ? 0.15 : 0.19) * s, 0), x + Math.cos(a) * r, base + y * s, z + Math.sin(a) * r, { ry: i, stroke: 0.0008 });
    }
  } else {
    for (let i = 0; i < 11; i++) {
      const a = i * 2.4, tilt = 0.25 + (i % 3) * 0.16;
      B.geo(kind === 'dark' ? '#5a3d4a' : '#8fa36f', new THREE.ConeGeometry(0.035 * s, 0.76 * s, 4), x + Math.cos(a) * 0.12 * s, base + 0.8 * s, z + Math.sin(a) * 0.12 * s, { rz: -Math.cos(a) * tilt, rx: Math.sin(a) * tilt, stroke: 0.0005 });
    }
  }
}

function sling(B, x, z) {
  const y = DK + 0.012;
  for (const s of [-1, 1]) {
    B.box(C.steel, 0.035, 0.035, 1.72, x + s * 0.33, y + 0.05, z, { stroke: 0.0006 });
    B.box(C.steel, 0.03, 0.3, 0.03, x + s * 0.33, y + 0.15, z + 0.72, { stroke: 0 });
    B.box(C.steel, 0.03, 0.3, 0.03, x + s * 0.33, y + 0.15, z - 0.28, { stroke: 0 });
    B.box(C.steel, 0.035, 0.84, 0.035, x + s * 0.33, y + 0.66, z - 0.86, { rx: -0.42, stroke: 0.0006 });
  }
  B.box(C.frame, 0.64, 0.03, 1.14, x, y + 0.3, z + 0.2, { stroke: 0.0008 });
  B.box(C.frame, 0.64, 0.8, 0.03, x, y + 0.66, z - 0.83, { rx: -0.42, stroke: 0.0008 });
}

function sideTable(B, x, z) {
  B.cyl(C.frame, 0.23, 0.025, x, DK + 0.52, z, { n: 16, stroke: 0.0008 });
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    B.box(C.frame, 0.018, 0.52, 0.018, x + Math.cos(a) * 0.17, DK + 0.26, z + Math.sin(a) * 0.17, { stroke: 0 });
  }
}

// Night replaces the round table with this fire pit, on the same spot.
function buildFirePit(kit, look, parent) {
  const group = new THREE.Group();
  group.position.set(16.75, DK + 0.02, -8.75);
  group.visible = false;
  parent.add(group);
  const P = kit.batch(group);
  P.cyl(C.rockDark, 0.66, 0.08, 0, 0.04, 0, { rt: 0.68, n: 24, stroke: 0.0012 });
  P.cyl(C.frame, 0.46, 0.28, 0, 0.21, 0, { rt: 0.6, n: 24, stroke: 0.0014 });
  P.cyl(C.steel, 0.62, 0.035, 0, 0.36, 0, { rt: 0.64, n: 26, stroke: 0.001 });
  P.cyl('#25201d', 0.53, 0.015, 0, 0.375, 0, { n: 22, stroke: 0, cast: false });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    P.geo(i % 2 ? C.rock : C.rockDark, new THREE.DodecahedronGeometry(0.1 + (i % 3) * 0.012), Math.cos(a) * 0.72, 0.09, Math.sin(a) * 0.72, { ry: i, rx: i * 0.6, sy: 0.82, stroke: 0.0009 });
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    P.cyl(i % 2 ? C.trunk : C.cedarDeep, 0.052, 0.72, Math.cos(a) * 0.14, 0.49, Math.sin(a) * 0.14, { n: 7, rx: Math.PI / 2 - 0.42, ry: -a + Math.PI / 2, stroke: 0.0009 });
  }
  P.commit();

  const coals = new THREE.Mesh(new THREE.CircleGeometry(0.44, 20), look.flat('#ff7a2f'));
  coals.rotation.x = -Math.PI / 2;
  coals.position.y = 0.39;
  group.add(coals);

  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), look.flat('#ff9a4d', { map: softDisc(), transparent: true, opacity: 0.26, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.012;
  glow.scale.set(6.4, 6.4, 1);
  glow.renderOrder = 2;
  group.add(glow);

  const flames = [];
  const flameMats = ['#ff6a26', '#ff9833', '#ffd36b'].map((c) => look.flat(c));
  [[0, 0, 0.27, 1.02, 0], [0.16, 0.08, 0.17, 0.72, 0], [-0.15, 0.1, 0.17, 0.78, 0], [0.02, -0.17, 0.17, 0.68, 0],
    [0.05, 0.04, 0.17, 0.72, 1], [-0.09, -0.05, 0.11, 0.48, 1], [0.12, -0.06, 0.1, 0.44, 1], [0.02, 0.02, 0.09, 0.42, 2]].forEach(([x, z, r, h, tone], i) => {
    const geo = new THREE.ConeGeometry(r, h, 8);
    geo.translate(0, h / 2, 0);
    const m = new THREE.Mesh(geo, flameMats[tone]);
    m.position.set(x, 0.42, z);
    m.renderOrder = 3 + tone;
    group.add(m);
    flames.push({ m, phase: i * 1.7, rate: 7 + (i % 4) * 2 });
  });
  return { group, flames };
}

function buildLounge(B, kit, parent, look) {
  // Authored in lounge-local z; the lounge group carries the shift back.
  const F = { x0: 10.2, x1: 20.05, z0: -11.55, z1: -3.4 }, top = DK + 0.44;
  fenceRun(B, F.x0, F.z0, F.x1, F.z0);
  fenceRun(B, F.x1, F.z0, F.x1, F.z1);
  fenceRun(B, F.x0, F.z0, F.x0, -8.7);

  // Built-in L bench of stacked cedar, with a low backrest on both runs.
  const seat = (x, z, w, d) => B.box(C.cedarLight, w, 0.09, d, x, top, z, { r: 0.012, stroke: 0.0014 });
  seat(17.25, -11.02, 4.9, 0.86);
  seat(19.55, -8.3, 0.86, 4.6);
  B.box(C.cedarDark, 4.7, top - DK - 0.05, 0.62, 17.25, DK + (top - DK - 0.05) / 2, -11.05, { stroke: 0.001 });
  B.box(C.cedarDark, 0.62, top - DK - 0.05, 4.4, 19.58, DK + (top - DK - 0.05) / 2, -8.3, { stroke: 0.001 });
  for (let i = 0; i < 4; i++) {
    B.box(C.cedar, 4.9, 0.12, 0.09, 17.25, top + 0.13 + i * 0.13, -11.44, { stroke: 0.0006 });
    B.box(C.cedar, 0.09, 0.12, 4.9, 19.94, top + 0.13 + i * 0.13, -8.5, { stroke: 0.0006 });
  }
  B.box(C.cedarLight, 0.1, 0.56, 0.86, 14.82, top + 0.28, -11.02, { rz: -0.22, stroke: 0.001 });

  // Round cedar table on a jute rug.
  B.cyl('#cdb892', 1.55, 0.012, 16.75, DK + 0.018, -8.75, { n: 28, stroke: 0, cast: false, sz: 0.74 });
  const table = new THREE.Group();
  table.position.set(16.75, DK, -8.75);
  parent.add(table);
  const T = kit.batch(table);
  T.cyl(C.cedarLight, 0.68, 0.055, 0, 0.5, 0, { n: 24, stroke: 0.0014 });
  T.cyl(C.cedar, 0.56, 0.05, 0, 0.44, 0, { n: 20, stroke: 0.0006 });
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    T.box(C.cedarDark, 0.075, 0.44, 0.075, Math.cos(a) * 0.42, 0.23, Math.sin(a) * 0.42, { stroke: 0.0008 });
  }
  T.commit();
  const fire = buildFirePit(kit, look, parent);

  // Grey-topped timber bench, sling loungers and side table in front of the lounge.
  B.box('#b8afa0', 2.5, 0.08, 0.62, 14.7, DK + 0.47, -6.65, { stroke: 0.0012 });
  for (const dx of [-1.15, 0, 1.15]) B.box(C.cedarLight, 0.12, 0.44, 0.54, 14.7 + dx, DK + 0.22, -6.65, { stroke: 0.0008 });
  B.box(C.cedarLight, 2.3, 0.07, 0.1, 14.7, DK + 0.2, -6.65, { stroke: 0.0006 });
  sling(B, 17.25, -4.85);
  sling(B, 19.05, -4.75);
  sideTable(B, 18.15, -4.65);

  // Planters, grouped at both ends of the bench as in the photos.
  planter(B, 11.05, -10.9, 1.25, 'bush');
  planter(B, 11.85, -10.6, 1.05, 'dark');
  planter(B, 11.75, -9.85, 0.82, 'grass');
  planter(B, 19.45, -5.55, 1.05, 'dark');
  planter(B, 19.62, -3.85, 1.2, 'vine');
  planter(B, 19.05, -3.6, 0.72, 'grass');
  planter(B, 19.65, -4.75, 1.0, 'grass');
  return { table, fire };
}

function buildForecourt(B) {
  // Cream folding chairs with cedar frames around little black tables.
  const folding = (x, z, ry) => {
    B.box(C.towel, 0.5, 0.045, 0.46, x, DK + 0.46, z, { ry, stroke: 0.001 });
    const bx = x - Math.sin(ry) * 0.25, bz = z - Math.cos(ry) * 0.25;
    B.box(C.cedarLight, 0.5, 0.36, 0.04, bx, DK + 0.8, bz, { ry, stroke: 0.001 });
    for (const s of [-1, 1]) {
      const lx = Math.cos(ry) * s * 0.23, lz = -Math.sin(ry) * s * 0.23;
      B.box(C.cedarLight, 0.04, 0.46, 0.04, x + lx + Math.sin(ry) * 0.2, DK + 0.23, z + lz + Math.cos(ry) * 0.2, { stroke: 0.0005 });
      B.box(C.cedarLight, 0.04, 0.92, 0.04, x + lx - Math.sin(ry) * 0.24, DK + 0.46, z + lz - Math.cos(ry) * 0.24, { stroke: 0.0005 });
    }
  };
  folding(17.7, -1.6, 0.3);
  folding(19.35, -1.45, -0.4);
  folding(19.75, -3.5, -0.6);
  sideTable(B, 18.55, -1.17);
  B.cyl(C.navy, 0.045, 0.22, 18.47, DK + 0.65, -1.14, { n: 8, stroke: 0.0006 });
  B.cyl(C.galv, 0.035, 0.16, 18.62, DK + 0.61, -1.22, { n: 8, stroke: 0.0005 });
  sideTable(B, 19.15, -2.95);
  B.cyl(C.galv, 0.035, 0.14, 19.15, DK + 0.6, -2.95, { n: 8, stroke: 0.0005 });

  // Folded black wagon by the Downpour.
  B.box(C.frame, 0.9, 0.44, 0.58, 8.3, DK + 0.42, -5.65, { r: 0.04, stroke: 0.0012 });
  for (const [dx, dz] of [[-0.38, -0.29], [0.38, -0.29], [-0.38, 0.29], [0.38, 0.29]]) {
    B.cyl(C.steel, 0.09, 0.05, 8.3 + dx, DK + 0.09, -5.65 + dz, { rz: Math.PI / 2, n: 10, stroke: 0.0006 });
  }
  B.box(C.frame, 0.03, 0.74, 0.03, 8.91, DK + 0.58, -5.65, { rz: -0.6, stroke: 0 });
  // Small plant on the step, as in the deck photo.
  B.cyl(C.frame, 0.09, 0.15, 3.6, DK + 0.25, -5.5, { rt: 0.12, n: 10, stroke: 0.0008 });
  B.geo(C.grass, new THREE.IcosahedronGeometry(0.15, 0), 3.6, DK + 0.43, -5.5, { stroke: 0.0008 });
}

function buildCanoes(kit, group) {
  const hull = new THREE.SphereGeometry(0.5, 16, 8);
  return [[9.15, -2.75, 0.55, C.suitC, C.navy], [14.9, -1.1, -0.42, '#3aa39a', C.ring]].map(([x, z, ry, col, vest], i) => {
    const boat = new THREE.Group();
    boat.position.set(x, 0.05, z);
    boat.rotation.y = ry;
    group.add(boat);
    const K = kit.batch(boat);
    K.geo(col, hull, 0, 0.06, 0, { sx: 2.75, sy: 0.32, sz: 0.5, stroke: 0.0016 });
    K.geo(C.frame, new THREE.CylinderGeometry(0.16, 0.2, 0.04, 14), 0, 0.2, 0, { sx: 1.8, stroke: 0.0007 });
    K.box(vest, 0.42, 0.09, 0.3, 0.68, 0.22, 0, { r: 0.03, stroke: 0.0008 });
    K.box(C.frame, 1.5, 0.025, 0.025, -0.1, 0.25, 0.09, { ry: 0.12, stroke: 0 });
    K.commit();
    return { boat, phase: i * 2.1, ry };
  });
}

function stringLights(B, group, look) {
  const bulbGeo = new THREE.CapsuleGeometry(0.038, 0.05, 2, 8);
  const bulbMat = look.flat(C.led);
  const up = new THREE.Vector3(0, 1, 0);
  const run = (a, b, sag, bulbs) => {
    const point = (k) => new THREE.Vector3(
      a[0] + (b[0] - a[0]) * k,
      a[1] + (b[1] - a[1]) * k - Math.sin(k * Math.PI) * sag,
      a[2] + (b[2] - a[2]) * k,
    );
    const segs = bulbs * 2;
    for (let i = 0; i < segs; i++) {
      const p = point(i / segs), q = point((i + 1) / segs), dir = q.clone().sub(p), len = dir.length();
      const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir.normalize()));
      const m = p.clone().add(q).multiplyScalar(0.5);
      B.geo(C.frame, new THREE.CylinderGeometry(0.008, 0.008, len, 4), m.x, m.y, m.z, { rx: e.x, ry: e.y, rz: e.z, stroke: 0, cast: false });
    }
    for (let i = 0; i <= bulbs; i++) {
      const p = point(i / bulbs);
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(p.x, p.y - 0.09, p.z);
      group.add(bulb);
    }
  };
  const F = FENCE, top = DK + 1.98;
  run([F.x0, top, F.z0 + 0.07], [15.1, top, F.z0 + 0.07], 0.16, 8);
  run([15.1, top, F.z0 + 0.07], [F.x1 - 0.07, top, F.z0 + 0.07], 0.16, 8);
  run([F.x1 - 0.07, top, F.z0 + 0.07], [F.x1 - 0.07, top, F.z1], 0.18, 11);
  // Overhead strands fanning out from the pavilion's front corner.
  const corner = [P.x1 + 0.05, P.floor + P.h + 0.25, P.z1 + 0.15];
  run(corner, [13.6, 5.2, -15.6], 0.5, 9);
  run(corner, [F.x1, DK + 2.0, -7.3], 0.75, 13);
  run(corner, [6.42, 5.9, -2.1], 0.22, 5);
  run(corner, [F.x0, DK + 2.0, -11.0], 0.35, 4);
  return bulbMat;
}

export function buildSite(scene, kit, look) {
  const group = new THREE.Group();
  scene.add(group);
  const B = kit.batch(group);

  buildDeck(B);
  const { roof, w, span } = buildPavilion(B, group, look);
  const R = kit.batch(roof);
  dressRoof(R, w, span);
  buildDownpour(B);
  const lounge = new THREE.Group();
  lounge.position.z = LOUNGE_DZ;
  group.add(lounge);
  const L = kit.batch(lounge);
  const { table, fire } = buildLounge(L, kit, lounge, look);
  L.commit();
  buildForecourt(B);
  const bulbMat = stringLights(B, group, look);
  B.commit();

  // A slightly deeper tone marks the square swim area; the canoes float in it.
  const swimGeo = new THREE.PlaneGeometry(SWIM.x1 - SWIM.x0, SWIM.z1 - SWIM.z0);
  swimGeo.rotateX(-Math.PI / 2);
  const swim = new THREE.Mesh(swimGeo, look.flat(C.waterDeep, { transparent: true, opacity: 0.32, depthWrite: false }));
  swim.position.set((SWIM.x0 + SWIM.x1) / 2, 0.004, (SWIM.z0 + SWIM.z1) / 2);
  group.add(swim);
  const canoes = buildCanoes(kit, group);
  R.commit();
  // Toon shading still lights surfaces from behind, so the metal roof uses a material
  // that ignores the lamp underneath it.
  roof.traverse((o) => {
    if (!o.isMesh || !['b76f49', 'cd8660'].includes(o.material.color.getHexString())) return;
    const metal = new THREE.MeshLambertMaterial({ color: o.material.color });
    metal.userData.outlineParameters = o.material.userData.outlineParameters;
    o.material = metal;
  });

  const lamp = new THREE.PointLight(0xffc27d, 10, 11, 1.8);
  lamp.position.set((P.x0 + P.x1) / 2, P.floor + P.h - 0.8, (P.z0 + P.z1) / 2);
  group.add(lamp);
  // Night lights: the fire pit's flicker and a warm wash across the open deck.
  const fireLight = new THREE.PointLight(0xff8d45, 0, 12, 1.6);
  fireLight.position.set(16.75, DK + 1.15, -8.75 + LOUNGE_DZ);
  const deckLight = new THREE.PointLight(0xffd08a, 0, 17, 1.6);
  deckLight.position.set(12.2, 3.6, -7.2);
  group.add(fireLight, deckLight);
  let nightLevel = 0;

  // The Downpour: 60 litres released by one pull of the cord.
  const streams = [];
  const streamGeo = new THREE.CylinderGeometry(0.013, 0.007, 1, 5);
  const streamMat = look.flat('#d8f2ef', { transparent: true, opacity: 0.62, depthWrite: false });
  for (let i = 0; i < 14; i++) {
    const a = i * 2.399, r = 0.02 + 0.13 * Math.sqrt((i + 1) / 14);
    const m = new THREE.Mesh(streamGeo, streamMat);
    m.userData = { x: SHOWER.x + Math.cos(a) * r, z: SHOWER.z - 0.04 + Math.sin(a) * r, phase: i * 0.37 };
    m.renderOrder = 6;
    group.add(m);
    streams.push(m);
  }
  const splashGeo = new THREE.RingGeometry(0.7, 1, 24);
  splashGeo.rotateX(-Math.PI / 2);
  const splash = new THREE.Mesh(splashGeo, look.flat(C.white, { transparent: true, opacity: 0, depthWrite: false }));
  splash.position.set(SHOWER.x, DK + 0.15, SHOWER.z - 0.04);
  splash.renderOrder = 6;
  group.add(splash);

  const headY = DK + 2.66, trayY = DK + 0.15;
  return {
    group,
    setTime(v) {
      lamp.intensity = v.lamp;
      deckLight.intensity = v.deck;
      nightLevel = v.night;
      bulbMat.color.copy(v.bulb);
      swim.material.color.copy(v.deep);
      for (const m of group.userData.signMats) m.color.setScalar(v.signs);
      // The table tucks away first, then the fire pit rises in its place.
      const out = 1 - smooth(clamp(v.night * 2));
      const up = smooth(clamp(v.night * 2 - 1));
      table.visible = out > 0.01;
      table.scale.setScalar(Math.max(0.01, out));
      fire.group.visible = up > 0.01;
      fire.group.scale.setScalar(Math.max(0.01, up));
    },
    update(t) {
      const w = Math.PI / 12;
      fireLight.intensity = nightLevel * nightLevel * 15 * (1 + Math.sin(t * w * 37) * 0.1 + Math.sin(t * w * 59) * 0.06);
      if (fire.group.visible) {
        for (const f of fire.flames) {
          const lick = Math.sin(t * w * f.rate * 4 + f.phase);
          f.m.scale.set(1 + lick * 0.08, 1 + lick * 0.2 + Math.sin(t * w * f.rate * 7 + f.phase) * 0.08, 1 - lick * 0.06);
          f.m.rotation.z = Math.sin(t * w * f.rate * 3 + f.phase) * 0.09;
        }
      }
      for (const c of canoes) {
        const w = Math.PI / 12;
        c.boat.position.y = 0.05 + Math.sin(t * w * 4 + c.phase) * 0.018;
        c.boat.rotation.z = Math.sin(t * w * 3 + c.phase) * 0.03;
        c.boat.rotation.y = c.ry + Math.sin(t * w + c.phase) * 0.05;
      }
      const u = (t - 10.4) / 2.0;
      const on = u > 0 && u < 1;
      const flow = on ? clamp(u / 0.08) * clamp((1 - u) / 0.12) : 0;
      for (const m of streams) {
        m.visible = flow > 0.01;
        if (!m.visible) continue;
        const len = (headY - trayY) * clamp(u / 0.12);
        const wob = Math.sin(t * 19 + m.userData.phase) * 0.012;
        m.scale.set(flow, Math.max(0.01, len), flow);
        m.position.set(m.userData.x + wob, headY - len / 2, m.userData.z - wob);
      }
      splash.visible = flow > 0.01;
      if (splash.visible) {
        const k = (t * 3.2) % 1;
        const s = 0.14 + k * 0.42;
        splash.scale.set(s, 1, s);
        splash.material.opacity = 0.75 * (1 - k) * flow;
      }
    },
  };
}
