// Jointed toy-scale guests: tapered limbs, elbows and knees, a turning torso and
// head, simple faces, and a wardrobe of hair, swimwear, towels, hats and props.
// Everything faces +z with the root at the soles of the feet.
import * as THREE from 'three';
import { C } from './kit.js';

const LINE = 0.0012;
const FINE = 0.0007;

// Profiles must run bottom to top so the surface faces outward.
const lathe = (pts, n = 14) => {
  const up = pts[0][1] <= pts[pts.length - 1][1] ? pts : [...pts].reverse();
  return new THREE.LatheGeometry(up.map(([r, y]) => new THREE.Vector2(r, y)), n);
};
const ball = (r, w = 12, h = 9) => new THREE.SphereGeometry(r, w, h);
const cap = (r, theta) => new THREE.SphereGeometry(r, 14, 8, 0, Math.PI * 2, 0, theta);

const THIGH = [[0.001, 0.03], [0.07, -0.02], [0.079, -0.12], [0.067, -0.32], [0.056, -0.44], [0.001, -0.48]];
const SHIN = [[0.001, 0.035], [0.054, 0], [0.059, -0.1], [0.046, -0.3], [0.036, -0.39], [0.001, -0.42]];
const UPPER_ARM = [[0.001, 0.05], [0.05, 0.01], [0.052, -0.1], [0.042, -0.26], [0.001, -0.31]];
const FOREARM = [[0.001, 0.035], [0.041, 0], [0.043, -0.08], [0.03, -0.24], [0.001, -0.27]];

function torsoProfile(build) {
  // A big, soft build: broad shoulders over a round belly.
  if (build === 'big') return [[0.001, -0.02], [0.165, 0], [0.194, 0.09], [0.202, 0.19], [0.194, 0.3], [0.198, 0.4], [0.162, 0.49], [0.06, 0.54], [0.001, 0.55]];
  return build === 'f'
    ? [[0.001, -0.02], [0.135, 0], [0.12, 0.1], [0.125, 0.2], [0.155, 0.32], [0.16, 0.4], [0.135, 0.47], [0.05, 0.53], [0.001, 0.54]]
    : [[0.001, -0.02], [0.14, 0], [0.135, 0.1], [0.15, 0.22], [0.178, 0.34], [0.188, 0.42], [0.15, 0.49], [0.055, 0.54], [0.001, 0.55]];
}

function buildHair(H, { hair, hairStyle = 'short', beard, skin, hat }) {
  const y = 0.13;
  if (hairStyle === 'bald') {
    if (beard === 'full') buildFullBeard(H, hair);
    return;
  }
  if (hairStyle === 'buzz') {
    H.geo(hair, cap(0.106, 1.25), 0, y, -0.008, { rx: -0.28, sy: 1.08, stroke: FINE });
  } else {
    H.geo(hair, cap(0.113, hairStyle === 'long' ? 1.5 : 1.36), 0, y, -0.012, { rx: -0.36, sy: 1.08, stroke: LINE });
  }
  if (hairStyle === 'short') {
    H.geo(hair, ball(0.07), 0, 0.1, -0.06, { sx: 1.35, sy: 0.9, stroke: FINE });
    if (!hat) H.geo(hair, ball(0.04), 0.045, 0.215, 0.05, { sx: 1.5, sy: 0.6, rz: 0.3, stroke: FINE });
  }
  if (hairStyle === 'bun') {
    H.geo(hair, ball(0.09), 0, 0.1, -0.05, { sx: 1.1, stroke: FINE });
    H.geo(hair, ball(0.052), 0, 0.255, -0.045, { stroke: LINE });
  }
  if (hairStyle === 'long') {
    H.geo(hair, ball(0.11), 0, 0.03, -0.065, { sx: 1.08, sy: 1.75, sz: 0.55, stroke: LINE });
    for (const s of [-1, 1]) H.geo(hair, ball(0.04), s * 0.095, 0.04, 0, { sy: 2.1, stroke: FINE });
  }
  if (hairStyle === 'braid') {
    H.geo(hair, ball(0.09), 0, 0.1, -0.05, { sx: 1.12, stroke: FINE });
    for (let i = 0; i < 7; i++) H.geo(hair, ball(0.033 - i * 0.0018), Math.sin(i * 1.6) * 0.008, 0.04 - i * 0.052, -0.125 - i * 0.004, { stroke: FINE });
  }
  if (hairStyle === 'curly') {
    for (let i = 0; i < 18; i++) {
      const a = i * 2.399, ring = 0.05 + (i / 18) * 0.075, up = 0.22 - (i / 18) * 0.13;
      if (Math.sin(a) > 0.2 && up < 0.19) continue; // keep curls off the face
      H.geo(hair, new THREE.IcosahedronGeometry(0.046, 0), Math.cos(a) * ring, up, Math.sin(a) * ring - 0.03, { ry: i, stroke: FINE });
    }
  }
  if (beard) {
    H.geo(hair, ball(0.08), 0, 0.058, 0.018, { sx: 0.96, sy: 0.82, sz: 1.02, stroke: FINE });
    H.geo(skin, ball(0.018), 0, 0.066, 0.094, { sx: 1.3, sy: 0.55, stroke: 0, cast: false });
  }
}

function buildFullBeard(H, color) {
  H.geo(color, ball(0.09, 14, 10), 0, 0.052, 0.024, { sx: 1.05, sy: 0.98, sz: 1.08, stroke: FINE });
  H.geo(color, ball(0.056, 10, 8), 0, -0.012, 0.066, { sx: 1.08, sy: 1.18, stroke: FINE });
  for (const s of [-1, 1]) {
    H.geo(color, ball(0.026, 7, 6), s * 0.093, 0.105, 0.012, { sx: 0.62, sy: 1.8, stroke: 0 });
    H.geo(color, ball(0.027, 8, 6), s * 0.03, 0.085, 0.112, { sx: 1.45, sy: 0.62, sz: 0.72, rz: s * -0.2, stroke: 0, cast: false });
  }
  H.box('#b8604f', 0.04, 0.009, 0.008, 0, 0.064, 0.123, { r: 0.003, stroke: 0, cast: false });
}

// Hibiscus print: five petals, a bright center and a leaf, wrapped onto a curved surface.
const PRINT = { base: '#168a92', band: '#f7ecd4', petals: ['#ff6f59', '#ffd36b', '#fff4df', '#ff8fa3'], eye: '#ffcf4a', leaf: '#0d5a58' };
function hibiscus(G, rx, rz, y, a, petal, size = 1) {
  const nx = Math.sin(a), nz = Math.cos(a);
  const place = (dt, dy, out = 1) => [nx * rx * out + nz * dt, y + dy, nz * rz * out - nx * dt];
  G.geo(PRINT.leaf, ball(0.012, 6, 4), ...place(0.024 * size, -0.018 * size, 1.002), { ry: a, rz: -0.7, sx: 1.8 * size, sy: 0.8 * size, sz: 0.24, stroke: 0, cast: false });
  for (let i = 0; i < 5; i++) {
    const t = (i / 5) * Math.PI * 2 + 0.3;
    G.geo(petal, ball(0.013, 6, 4), ...place(Math.cos(t) * 0.016 * size, Math.sin(t) * 0.016 * size, 1.006), { ry: a, rz: t, sx: 1.35 * size, sy: 0.95 * size, sz: 0.24, stroke: 0, cast: false });
  }
  G.geo(PRINT.eye, ball(0.006, 5, 4), ...place(0, 0, 1.012), { ry: a, sz: 0.5, stroke: 0, cast: false });
}

function buildHat(H, hat) {
  if (hat === 'felt') {
    H.geo(C.felt, lathe([[0.001, 0.33], [0.05, 0.32], [0.092, 0.25], [0.122, 0.17], [0.128, 0.15], [0.001, 0.15]]), 0, 0, 0, { stroke: LINE });
    H.geo('#c4b290', new THREE.TorusGeometry(0.125, 0.024, 6, 18), 0, 0.165, 0, { rx: Math.PI / 2, stroke: FINE });
  }
  if (hat === 'cap' || hat === 'capB') {
    const col = hat === 'cap' ? C.navy : '#b8a98c';
    H.geo(col, cap(0.118, 1.42), 0, 0.15, -0.004, { sy: 0.92, stroke: LINE });
    H.box(col, 0.15, 0.014, 0.11, 0, 0.166, 0.145, { rx: 0.12, r: 0.006, stroke: FINE });
  }
}

function buildFace(H, { skin, brow }) {
  H.geo(skin, ball(0.1, 16, 12), 0, 0.125, 0, { sy: 1.12, sz: 1.03, stroke: LINE });
  H.geo(skin, ball(0.078), 0, 0.066, 0.014, { sx: 0.92, sy: 0.92, stroke: 0 });
  for (const s of [-1, 1]) {
    H.geo(skin, ball(0.027, 8, 6), s * 0.099, 0.112, -0.004, { sx: 0.55, sy: 1.25, stroke: FINE });
    H.geo('#20201e', ball(0.0125, 8, 6), s * 0.038, 0.13, 0.094, { sy: 1.18, sz: 0.55, stroke: 0, cast: false });
    H.box(brow, 0.04, 0.009, 0.012, s * 0.039, 0.157, 0.097, { rz: s * -0.1, stroke: 0, cast: false });
  }
  H.geo(skin, ball(0.017, 8, 6), 0, 0.103, 0.109, { sy: 1.25, stroke: 0 });
  H.box('#8a4f43', 0.038, 0.007, 0.01, 0, 0.066, 0.095, { stroke: 0, cast: false });
}

function buildSuitTorso(B, spec, profile) {
  const { suit, skin } = spec;
  const cover = (from, to, color, grow = 1.018) => {
    const pts = [];
    for (let i = 0; i < profile.length - 1; i++) {
      const [r0, y0] = profile[i], [r1, y1] = profile[i + 1];
      for (let k = 0; k <= 4; k++) {
        const y = y0 + (y1 - y0) * (k / 4);
        if (y >= from && y <= to) pts.push([(r0 + (r1 - r0) * (k / 4)) * grow, y]);
      }
    }
    B.geo(color, lathe(pts, 16), 0, 0, 0, { sz: 0.74, stroke: FINE });
  };
  if (spec.top) {
    cover(0, 0.47, spec.top, 1.035);
  } else if (suit.type === 'onepiece') {
    cover(0, 0.36, suit.a);
    for (const s of [-1, 1]) B.box(suit.a, 0.028, 0.17, 0.012, s * 0.085, 0.42, 0.112, { rx: -0.42, stroke: 0, cast: false });
    if (suit.b) {
      [[-0.07, 0.25], [0.06, 0.29], [0.0, 0.17], [-0.08, 0.08], [0.08, 0.1], [0.02, 0.04]].forEach(([x, y]) => {
        B.geo(suit.b, ball(0.024, 8, 6), x, y, 0.094, { sz: 0.35, stroke: 0, cast: false });
      });
    }
  } else if (suit.type === 'bikini' || suit.type === 'wrap') {
    cover(0.255, 0.365, suit.a);
    for (const s of [-1, 1]) B.box(suit.a, 0.02, 0.15, 0.01, s * 0.075, 0.43, 0.105, { rx: -0.42, rz: s * 0.12, stroke: 0, cast: false });
  }
  void skin;
}

function buildTowel(B, spec) {
  if (spec.towel !== 'shoulders') return;
  const col = spec.towelColor || C.towel;
  B.geo(col, new THREE.TorusGeometry(0.128, 0.052, 8, 20), 0, 0.475, -0.01, { rx: Math.PI / 2 - 0.08, sz: 0.82, stroke: LINE });
  for (const s of [-1, 1]) {
    B.box(col, 0.085, 0.34, 0.03, s * 0.085, 0.3, 0.118, { r: 0.012, rz: s * 0.05, stroke: FINE });
    B.box(spec.towelStripe || C.suitC, 0.087, 0.022, 0.033, s * 0.085, 0.18, 0.118, { stroke: 0, cast: false });
  }
  B.box(col, 0.27, 0.36, 0.03, 0, 0.3, -0.128, { r: 0.012, stroke: FINE });
}

function buildProp(B, prop) {
  if (prop === 'cup') {
    B.cyl('#d9503c', 0.03, 0.09, 0.0, -0.075, 0.04, { rt: 0.037, n: 10, stroke: FINE });
  } else if (prop === 'bottle') {
    B.cyl(C.suitC, 0.031, 0.15, 0, -0.08, 0.04, { n: 10, stroke: FINE });
    B.cyl(C.galv, 0.017, 0.03, 0, 0.01, 0.04, { n: 8, stroke: 0 });
  } else if (prop === 'phone') {
    B.box(C.frame, 0.07, 0.13, 0.01, 0, -0.075, 0.035, { rx: -0.25, stroke: FINE });
    B.box('#8fc4d6', 0.058, 0.11, 0.002, 0, -0.074, 0.042, { rx: -0.25, stroke: 0, cast: false });
  }
}

export function createGuest(kit, spec) {
  const { skin, suit = { type: 'trunks', a: C.suitB, b: C.white }, build = 'm', brow = spec.hair || C.hair } = spec;
  const batches = [];
  const batchFor = (group) => { const b = kit.batch(group, { actor: true }); batches.push(b); return b; };

  const root = new THREE.Group();
  const Pel = batchFor(root);
  const pelvisCol = suit.type === 'onepiece' ? suit.a : suit.type === 'bikini' ? (suit.b || suit.a) : suit.type === 'wrap' ? (suit.b || C.towel) : suit.a;
  const big = build === 'big', limb = big ? 1.2 : 1;
  const hipWide = big ? 1.28 : build === 'f' ? 1.06 : 1, hipDeep = big ? 0.98 : 0.76;
  const hawaiian = suit.type === 'hawaiian';
  Pel.geo(hawaiian ? PRINT.base : pelvisCol, lathe([[0.001, 0.77], [0.115, 0.79], [0.158, 0.87], [0.15, 0.95], [0.135, 0.99], [0.001, 1.0]]), 0, 0, 0, { sx: hipWide, sz: hipDeep, stroke: LINE });
  if (hawaiian) {
    Pel.cyl(PRINT.band, 0.158, 0.034, 0, 0.972, 0, { n: 18, sx: hipWide, sz: hipDeep, stroke: FINE, cast: false });
    for (const s of [-1, 1]) Pel.box(PRINT.band, 0.009, 0.075, 0.007, s * 0.022, 0.925, 0.158, { rz: s * 0.14, stroke: 0, cast: false });
    for (let i = 0; i < 12; i++) hibiscus(Pel, 0.156 * hipWide, 0.156 * hipDeep, 0.855 + (i % 3) * 0.035, i * 2.399, PRINT.petals[i % 4], 0.86);
  }
  if (suit.type === 'trunks') Pel.cyl(suit.b || C.white, 0.15, 0.03, 0, 0.965, 0, { n: 16, sz: 0.76, stroke: 0, cast: false });

  const chest = new THREE.Group();
  chest.position.y = 0.92;
  root.add(chest);
  const Ch = batchFor(chest);
  const profile = torsoProfile(build);
  Ch.geo(skin, lathe(profile, 16), 0, 0, 0, { sz: big ? 0.88 : 0.72, stroke: LINE });
  Ch.cyl(skin, big ? 0.07 : 0.05, 0.11, 0, 0.56, 0.004, { rt: big ? 0.064 : 0.046, n: 10, stroke: 0 });
  buildSuitTorso(Ch, spec, profile);
  buildTowel(Ch, spec);

  const head = new THREE.Group();
  head.position.set(0, 0.59, 0.006);
  chest.add(head);
  const H = batchFor(head);
  buildFace(H, { skin, brow });
  if (spec.hat !== 'felt') buildHair(H, spec);
  else if (spec.beard) buildHair(H, { ...spec, hairStyle: 'bald' });
  buildHat(H, spec.hat);

  const leg = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * (big ? 0.112 : 0.088), 0.88, 0);
    root.add(pivot);
    const T = batchFor(pivot);
    T.geo(skin, lathe(THIGH), 0, 0, 0, { sx: limb, sz: 0.94 * limb, stroke: LINE });
    if (suit.type === 'trunks') {
      T.geo(suit.a, lathe([[0.001, 0.05], [0.088, 0.02], [0.092, -0.12], [0.086, -0.27], [0.001, -0.272]]), 0, 0, 0, { sz: 0.98, stroke: FINE });
      T.box(suit.b || C.white, 0.012, 0.25, 0.034, side * 0.09, -0.13, 0, { stroke: 0, cast: false });
    }
    if (hawaiian) {
      // Loose board-short legs that stop just above the knee.
      T.geo(PRINT.base, lathe([[0.001, 0.06], [0.112, 0.03], [0.119, -0.1], [0.124, -0.26], [0.127, -0.335], [0.001, -0.34]], 18), 0, 0, 0, { stroke: LINE });
      T.cyl(PRINT.band, 0.129, 0.018, 0, -0.327, 0, { n: 18, stroke: 0, cast: false });
      for (let i = 0; i < 15; i++) {
        const y = -0.035 - (i / 14) * 0.25;
        hibiscus(T, 0.119 + (-y) * 0.03, 0.119 + (-y) * 0.03, y, side * i * 2.399 + 0.5, PRINT.petals[i % 4]);
      }
    }
    if (suit.type === 'wrap') {
      T.geo(suit.b || C.towel, lathe([[0.001, 0.05], [0.102, 0.02], [0.108, -0.2], [0.104, -0.42], [0.001, -0.425]]), 0, 0, 0, { sz: 1.02, stroke: FINE });
      for (const y of [-0.08, -0.2, -0.32]) T.cyl(suit.c || C.suitC, 0.11, 0.028, 0, y, 0, { n: 12, sz: 1.02, stroke: 0, cast: false });
    }
    const knee = new THREE.Group();
    knee.position.y = -0.44;
    pivot.add(knee);
    const K = batchFor(knee);
    K.geo(skin, lathe(SHIN), 0, 0, 0, { sx: big ? 1.14 : 1, sz: big ? 1.12 : 0.98, stroke: LINE });
    K.box(skin, 0.092, 0.055, 0.235, 0, -0.41, 0.058, { r: 0.024, stroke: FINE });
    return { pivot, knee };
  };

  const arm = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * (big ? 0.25 : build === 'f' ? 0.195 : 0.218), 0.455, 0);
    chest.add(pivot);
    const U = batchFor(pivot);
    U.geo(skin, ball(big ? 0.066 : 0.06), 0, 0, 0, { stroke: FINE });
    U.geo(skin, lathe(UPPER_ARM), 0, 0, 0, { sx: big ? 1.14 : 1, sz: big ? 1.14 : 1, stroke: LINE });
    const elbow = new THREE.Group();
    elbow.position.y = -0.28;
    pivot.add(elbow);
    const F = batchFor(elbow);
    F.geo(skin, lathe(FOREARM), 0, 0, 0, { sx: big ? 1.14 : 1, sz: big ? 1.14 : 1, stroke: LINE });
    const hand = new THREE.Group();
    hand.position.y = -0.255;
    elbow.add(hand);
    const Hd = batchFor(hand);
    Hd.geo(skin, ball(0.042, 9, 7), 0, -0.04, 0, { sx: 0.95, sy: 1.35, sz: 0.62, stroke: FINE });
    Hd.geo(skin, ball(0.015, 6, 5), side * -0.035, -0.035, 0.018, { sy: 2, stroke: 0 });
    if (side > 0 && spec.prop) buildProp(Hd, spec.prop);
    return { pivot, elbow };
  };

  const guest = { root, chest, head, hipL: leg(-1), hipR: leg(1), armL: arm(-1), armR: arm(1) };
  root.name = 'pelvis'; chest.name = 'torso'; head.name = 'head';
  for (const [limb, label] of [[guest.hipL, 'leg L'], [guest.hipR, 'leg R']]) { limb.pivot.name = `thigh ${label}`; limb.knee.name = `shin ${label}`; }
  for (const [limb, label] of [[guest.armL, 'arm L'], [guest.armR, 'arm R']]) { limb.pivot.name = `upper ${label}`; limb.elbow.name = `fore ${label}`; }
  batches.forEach((b) => b.commit());
  return guest;
}

export function setPose(p, {
  hl = 0, hr = 0, kl = 0.04, kr = 0.04,
  al = 0, ar = 0, el = -0.14, er = -0.14, azl = -0.09, azr = 0.09,
  lean = 0, tw = 0, hx = 0, hy = 0,
}) {
  p.hipL.pivot.rotation.x = hl;
  p.hipR.pivot.rotation.x = hr;
  p.hipL.knee.rotation.x = kl;
  p.hipR.knee.rotation.x = kr;
  p.armL.pivot.rotation.set(al, 0, azl);
  p.armR.pivot.rotation.set(ar, 0, azr);
  p.armL.elbow.rotation.x = el;
  p.armR.elbow.rotation.x = er;
  p.chest.rotation.set(lean, tw, 0);
  p.head.rotation.set(hx, hy, 0);
}
