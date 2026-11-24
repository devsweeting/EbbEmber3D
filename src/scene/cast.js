// Guests and the 24 s sweat, plunge, repeat loop. Everything is a function of t.
import * as THREE from 'three';
import { C, clamp, lerp, smooth } from './kit.js';
import { DECK } from './sauna.js';
import { DK, SHOWER } from './site.js';
import { createGuest as person, setPose } from './guest.js';

// Two identical 24 s cycles, each leaving the roof with a backflip.
export const CYCLE = 24;
export const LOOP = 48;

// Shared seated and leaning poses; each guest varies them below.
const SIT = { hl: -1.48, hr: -1.48, kl: 1.42, kr: 1.42, al: -0.35, ar: -0.35, el: -0.72, er: -0.72 };
const RAIL = { al: -0.75, ar: -0.75, el: -0.7, er: -0.7, lean: 0.22, hx: -0.08 };

const ROOF_Y = 3.45;
const EDGE = [-4.15, ROOF_Y, 2.3];
const ENTRY = [-4.85, -1.78, 4.2];
const UP = [-4.85, -1.22, 4.2];
const AROUND = [-6.85, -1.22, 3.05]; // swims around the float's corner
const IN = [-6.59, -1.22, 1.4];
const L = [-6.59, DECK, 1.4];
// From the ladder he turns left, up the open porch and along the dock-side walkway.
const B = [-5.5, DECK, 1.4];
const P1 = [-5.05, DECK, -1.62];
const P2 = [-4.55, DECK, -2.0];
// The door side has no fence, so he simply curves out around the stovepipe.
const Q1 = [-3.55, DECK, -2.38];
const Q2 = [-2.75, DECK, -2.38];
const Q3 = [-2.15, DECK, -2.0];
const Q4 = [-1.4, DECK, -2.0];
const P3 = [4.5, DECK, -2.0];
const FOOT = [4.93, DECK, -2.2];
const TOP = [4.93, ROOF_Y + 0.1, 0.97];
const LANDING = [4.93, ROOF_Y, 1.43];
const R1 = [4.0, ROOF_Y, 1.43];
const R2 = [3.4, ROOF_Y, -0.7];
const R3 = [-3.2, ROOF_Y, -0.7];
const R0 = [-4.15, ROOF_Y, 1.6];
const PI2 = Math.PI / 2;
const heading = (a, b) => Math.atan2(b[0] - a[0], b[2] - a[2]);

// The backflip is solved as a real jump. Feet stay planted through the crouch and
// drive; once airborne the center of mass follows a parabola, and the spin obeys
// conserved angular momentum: faster in the tuck, slower as the body opens.
const TAKEOFF = 0.95, GRAVITY = 8.2, LAUNCH = 3.75, DRIVE_TILT = 0.34, PLUNGE_DEPTH = -ENTRY[1];
const THIGH_LEN = 0.44, SHIN_LEN = 0.44;
const sole = (h, k) => new THREE.Vector3(0, 0.88 - THIGH_LEN * Math.cos(h) - SHIN_LEN * Math.cos(h + k), -THIGH_LEN * Math.sin(h) - SHIN_LEN * Math.sin(h + k));
const SOLE_STAND = sole(0, 0.05);
const comIn = (tuck) => new THREE.Vector3(0, 0.92 + 0.05 * tuck, 0.13 * tuck);
const flipTuck = (s) => smooth(clamp((s - 0.07) / 0.17)) * (1 - smooth(clamp((s - 0.6) / 0.2)));
const FLIP = (() => {
  const R0 = new THREE.Euler(DRIVE_TILT, Math.PI, 0);
  const start = new THREE.Vector3(...EDGE).sub(sole(0, 0.04).sub(SOLE_STAND).applyEuler(R0)).add(comIn(0).applyEuler(R0));
  const drop = start.y - comIn(0).y;
  const flight = (LAUNCH + Math.sqrt(LAUNCH * LAUNCH + 2 * GRAVITY * drop)) / GRAVITY;
  const entrySpeed = GRAVITY * flight - LAUNCH;
  // Spin rate is inverse to moment of inertia, and nearly stops as he spots the water.
  const N = 360, table = new Float32Array(N + 1);
  for (let i = 1; i <= N; i++) {
    const s = (i - 0.5) / N;
    const rate = (1 / lerp(1, 0.34, flipTuck(s))) * (1 - 0.82 * smooth(clamp((s - 0.8) / 0.2)));
    table[i] = table[i - 1] + rate;
  }
  const total = table[N];
  const angle = (s) => {
    const f = clamp(s) * N, i = Math.min(N - 1, Math.floor(f));
    return DRIVE_TILT + (Math.PI * 2 - DRIVE_TILT) * lerp(table[i], table[i + 1], f - i) / total;
  };
  return { start, flight, land: TAKEOFF + flight, plunge: 2 * PLUNGE_DEPTH / entrySpeed, angle };
})();
const SPLASH = FLIP.land, SURFACE = SPLASH + FLIP.plunge, LADDER = 5.05;

// Beat table in absolute seconds within one 24 s cycle.
const BEATS = (() => {
  const raw = [
    [0, TAKEOFF, EDGE, EDGE, 'idle', 0, true],
    [TAKEOFF, SPLASH, EDGE, ENTRY, 'fly', 0, false],
    [SPLASH, SURFACE, ENTRY, ENTRY, 'plunge', 0, false],
    [SURFACE, SURFACE + 0.4, ENTRY, UP, 'surface', 0, false],
    [SURFACE + 0.4, 4.3, UP, AROUND, 'swim', null, false],
    [4.3, LADDER, AROUND, IN, 'swim', null, false],
    [LADDER, 6.55, IN, L, 'climb', PI2, false],
    [6.55, 7.05, L, B, 'step', null, false],
    [7.05, 8.6, B, P1, 'walk', null, false],
    [8.6, 8.95, P1, P2, 'walk', null, false],
    [8.95, 9.54, P2, Q1, 'walk', null, false],
    [9.54, 9.98, Q1, Q2, 'walk', null, false],
    [9.98, 10.37, Q2, Q3, 'walk', null, false],
    [10.37, 10.78, Q3, Q4, 'walk', null, false],
    [10.78, 14.0, Q4, P3, 'walk', null, false],
    [14.0, 14.75, P3, FOOT, 'step', 0, false],
    [14.75, 16.6, FOOT, TOP, 'stairs', 0, false],
    [16.6, 16.95, TOP, LANDING, 'walk', 0, false],
    [16.95, 17.4, LANDING, R1, 'walk', null, true],
    [17.4, 18.5, R1, R2, 'walk', null, true],
    [18.5, 21.6, R2, R3, 'walk', null, true],
    [21.6, 22.8, R3, R0, 'walk', null, true],
    [22.8, 23.3, R0, EDGE, 'walk', null, true],
    [23.3, 24, EDGE, EDGE, 'idle', 0, true],
  ];
  let yaw = 0, walked = 0;
  return raw.map(([t0, t1, from, to, mode, fixed, roof]) => {
    let y1 = fixed ?? heading(from, to);
    while (y1 - yaw > Math.PI) y1 -= Math.PI * 2;
    while (y1 - yaw < -Math.PI) y1 += Math.PI * 2;
    const length = Math.hypot(to[0] - from[0], to[2] - from[2]);
    const beat = { t0, t1, from, to, mode, y0: yaw, y1, roof, length, walked };
    if (mode === 'walk') walked += length; // one continuous stride across path segments
    yaw = y1;
    return beat;
  });
})();

const NEUTRAL = { hl: 0, hr: 0, kl: 0.04, kr: 0.04, al: 0, ar: 0, el: -0.14, er: -0.14, azl: -0.09, azr: 0.09, lean: 0, tw: 0, hx: 0, hy: 0 };
const BLEND = 0.17;
const mixPose = (a, b, k) => {
  const out = {};
  for (const key of Object.keys(NEUTRAL)) out[key] = lerp(a[key] ?? NEUTRAL[key], b[key] ?? NEUTRAL[key], k);
  return out;
};
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// Seated legs reach the floor: the thigh tips down and the shin stays vertical.
// `drop` is the cosine of the thigh angle needed for this seat height.
const seatFit = (drop) => { const a = Math.acos(drop); return { hl: -a, hr: -a, kl: a, kr: a }; };

function diverPose(b, tt) {
  const u = clamp((tt - b.t0) / (b.t1 - b.t0));
  if (b.mode === 'walk') {
    // Hips sweep at a constant rate so the planted foot keeps pace with the ground.
    const ph = (b.walked + b.length * u) * 3.88, s = Math.sin(ph), c = Math.cos(ph);
    const stride = (2 / Math.PI) * Math.asin(s);
    return { hl: stride * 0.46, hr: -stride * 0.46, kl: 0.08 + Math.max(0, -c) * 0.66, kr: 0.08 + Math.max(0, c) * 0.66, al: -s * 0.36, ar: s * 0.36, el: -0.24 - Math.max(0, s) * 0.34, er: -0.24 - Math.max(0, -s) * 0.34, azl: -0.02, azr: 0.02, tw: s * 0.09, lean: 0.05, hy: -s * 0.04 };
  }
  if (b.mode === 'stairs') {
    const s = Math.sin(u * Math.PI * 11);
    return { hl: -0.62 + s * 0.52, hr: -0.62 - s * 0.52, kl: 0.72 - s * 0.5, kr: 0.72 + s * 0.5, al: -0.32 - s * 0.26, ar: -0.32 + s * 0.26, el: -0.5, er: -0.5, lean: 0.2, tw: s * 0.06, hx: -0.12 };
  }
  if (b.mode === 'climb') {
    const s = Math.sin(lerp(b.from[1], b.to[1], u) * 11);
    return { hl: -0.8 + s * 0.42, hr: -0.8 - s * 0.42, kl: 1.0 - s * 0.45, kr: 1.0 + s * 0.45, al: -2.2 - s * 0.3, ar: -2.2 + s * 0.3, el: -0.45 + s * 0.3, er: -0.45 - s * 0.3, lean: 0.14, hx: -0.2 };
  }
  if (b.mode === 'fly') {
    const k = flipTuck(u);
    const reach = 1 - smooth(clamp(u / 0.2)), open = smooth(clamp((u - 0.62) / 0.24));
    const arm = lerp(lerp(-1.3, -2.95, reach), -0.1, open);
    const elbow = lerp(lerp(-1.42, -0.08, reach), -0.12, open);
    return { hl: -2.2 * k, hr: -2.2 * k, kl: 0.04 + 2.42 * k, kr: 0.04 + 2.42 * k, al: arm, ar: arm, el: elbow, er: elbow, azl: lerp(-0.2, -0.16, open), azr: lerp(0.2, 0.16, open), lean: 0.44 * k - 0.12 * reach, hx: 0.34 * k - 0.26 * reach + 0.08 * open };
  }
  if (b.mode === 'plunge') return { hl: 0, hr: 0, kl: 0.05, kr: 0.05, al: -0.08, ar: -0.08, el: -0.1, er: -0.1, azl: -0.15, azr: 0.15, hx: 0.08 };
  if (b.mode === 'swim' || b.mode === 'surface') {
    const ph = tt * 4.2;
    return { hl: Math.sin(ph) * 0.3, hr: -Math.sin(ph) * 0.3, kl: 0.3, kr: 0.3, al: wrapAngle(-ph), ar: wrapAngle(-ph - Math.PI), el: -0.28, er: -0.28, azl: -0.2, azr: 0.2, lean: 0.22, tw: Math.sin(ph) * 0.14, hx: -0.28 };
  }
  if (b.mode === 'step') {
    const s = Math.sin(u * Math.PI * 2);
    return { hl: s * 0.3, hr: -s * 0.3, kl: 0.25, kr: 0.25, al: -0.5, ar: -0.5, el: -0.4, er: -0.4, lean: 0.1 };
  }
  // At the edge: load the legs, swing the arms back, then drive up and overhead.
  const load = tt < TAKEOFF ? smooth((tt - 0.28) / 0.42) * (1 - smooth((tt - 0.72) / (TAKEOFF - 0.72))) : 0;
  const swing = tt < TAKEOFF ? smooth((tt - 0.66) / (TAKEOFF - 0.66)) : 0;
  const a = Math.sin(tt * (Math.PI / 12) * 6) * 0.035;
  return { hl: -1.02 * load, hr: -1.02 * load, kl: 0.05 + 1.02 * load, kr: 0.05 + 1.02 * load, al: a * (1 - swing) + 0.95 * load * (1 - swing) - 2.95 * swing, ar: -a * (1 - swing) + 0.95 * load * (1 - swing) - 2.95 * swing, el: lerp(-0.14 - 0.1 * load, -0.08, swing), er: lerp(-0.14 - 0.1 * load, -0.08, swing), azl: lerp(-0.14, -0.2, swing), azr: lerp(0.14, 0.2, swing), lean: 0.6 * load - 0.12 * swing, hx: 0.14 * load - 0.26 * swing };
}

export function buildCast(sauna, kit, look, site) {
  // The backflipper: a big, bald, bearded guy in Hawaiian shorts.
  const plunger = person(kit, { skin: '#c68d63', hair: '#4f3120', hairStyle: 'bald', beard: 'full', build: 'big', suit: { type: 'hawaiian' } });
  sauna.group.add(plunger.root);

  const guests = [
    // Inside on the benches: felt hat upstairs, elbows on knees below.
    { p: person(kit, { skin: C.skinB, hair: C.hair, hat: 'felt', beard: true, suit: { type: 'trunks', a: C.suitC, b: C.towel } }), parent: sauna.group, at: [-1.45, DECK + 0.94 - 0.82, -1.05], yaw: 0.12, pose: { ...SIT, lean: -0.08, hx: -0.12 }, phase: 0.4, look: 0.12 },
    { p: person(kit, { skin: C.skinC, hair: C.hairB, hairStyle: 'bun', build: 'f', suit: { type: 'onepiece', a: C.suitA } }), parent: sauna.group, at: [-0.42, DECK + 0.49 - 0.82, -0.52], yaw: -0.1, pose: { ...SIT, lean: 0.34, al: -0.62, ar: -0.62, el: -1.0, er: -1.0, hx: 0.16 }, phase: 2.1, look: 0.06 },
    // Two friends leaning on the roof rail, well clear of the dive edge.
    { p: person(kit, { skin: C.skinC, hair: C.hairB, hairStyle: 'curly', suit: { type: 'trunks', a: C.suitC, b: C.white } }), parent: sauna.roof, at: [3.08, 3.45, 1.9], yaw: 0.08, pose: { ...RAIL, hy: 0.42 }, phase: 0.2, look: 0.08, talk: 0.16 },
    { p: person(kit, { skin: C.skinA, hair: C.hair, hairStyle: 'long', build: 'f', suit: { type: 'bikini', a: C.suitB, b: C.navy } }), parent: sauna.roof, at: [3.72, 3.45, 1.9], yaw: -0.08, pose: { ...RAIL, hy: -0.42 }, phase: 3.3, look: 0.08 },
    // Open deck: chairs by the small table, one on a phone, one with a drink.
    { p: person(kit, { skin: C.skinB, hair: C.hair, hairStyle: 'short', prop: 'phone', suit: { type: 'trunks', a: C.suitB, b: '#2f6fb0' } }), parent: site.group, at: [17.7, DK + 0.48 - 0.82, -1.52], yaw: 0.25, pose: { ...SIT, lean: 0.22, ar: -0.3, er: -1.72, hx: 0.34, hy: -0.04 }, phase: 0.9, look: 0.03 },
    { p: person(kit, { skin: C.skinA, hair: C.hair, hairStyle: 'braid', build: 'f', prop: 'cup', suit: { type: 'wrap', a: C.navy, b: C.suitC, c: C.suitB } }), parent: site.group, at: [19.35, DK + 0.48 - 0.82, -1.37], yaw: -0.4, pose: { ...SIT, ar: -0.42, er: -1.45, hy: 0.38 }, phase: 2.7, look: 0.14 },
    // Lounge: settled back on the built-in L bench.
    { p: person(kit, { skin: C.skinC, hair: C.hair, hat: 'capB', hairStyle: 'short', towel: 'shoulders', towelColor: '#efe7d6', suit: { type: 'trunks', a: C.navy, b: C.white } }), parent: site.group, at: [16.4, DK + 0.56 - 0.82, -13.08], yaw: 0.05, pose: { ...SIT, lean: -0.13, hy: -0.2 }, phase: 1.6, look: 0.16 },
    { p: person(kit, { skin: C.skinD, hair: C.hairB, hairStyle: 'curly', build: 'f', prop: 'bottle', suit: { type: 'onepiece', a: C.frame, b: C.ember } }), parent: site.group, at: [19.34, DK + 0.56 - 0.82, -10.3], yaw: -Math.PI / 2, pose: { ...SIT, lean: -0.1, ar: -0.45, er: -1.2, hy: 0.22 }, phase: 3.5, look: 0.14 },
    // Two friends talking on the open deck.
    { p: person(kit, { skin: C.skinA, hair: C.hair, hat: 'cap', top: C.white, suit: { type: 'trunks', a: C.suitA, b: C.white } }), parent: site.group, at: [8.95, DK, -7.0], yaw: 0.95, pose: { al: -0.18, ar: -0.46, er: -0.92, hy: -0.1 }, phase: 0.5, look: 0.1, talk: 0.28 },
    { p: person(kit, { skin: C.skinB, hair: C.hairB, hairStyle: 'long', build: 'f', prop: 'cup', suit: { type: 'wrap', a: C.suitC, b: C.suitB, c: C.towel } }), parent: site.group, at: [9.6, DK, -6.45], yaw: -2.2, pose: { al: 0.08, el: -1.05, azl: -0.32, ar: -0.42, er: -1.5, hy: 0.08 }, phase: 2.4, look: 0.1 },
  ];
  // Solved from each seat and floor height, so seated feet rest on the surface below.
  [0.15, 0.127, 0, 0, 0.218, 0.218, 0.372, 0.372, 0, 0].forEach((drop, i) => {
    if (drop) guests[i].pose = { ...guests[i].pose, ...seatFit(drop) };
  });
  // The guest under the Downpour: reach, pull, take the cold, recover.
  const showerer = person(kit, { skin: C.skinC, hair: C.hair, hairStyle: 'braid', build: 'f', suit: { type: 'onepiece', a: C.suitB, b: '#f3c36b' } });
  site.group.add(showerer.root);
  showerer.root.position.set(SHOWER.x + 0.02, DK + 0.14, SHOWER.z + 0.12);
  showerer.root.rotation.y = -0.2;
  for (const g of guests) {
    g.parent.add(g.p.root);
    g.p.root.position.set(...g.at);
    g.p.root.rotation.y = g.yaw;
  }

  // Entry and exit ripples, latched at the ladder.
  const ringGeo = new THREE.RingGeometry(0.86, 1, 40);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = look.flat(C.white, { transparent: true, opacity: 0, depthWrite: false });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.renderOrder = 4;
  sauna.group.add(ring);
  const wake = new THREE.Mesh(ringGeo, look.flat(C.ripple, { transparent: true, opacity: 0, depthWrite: false }));
  wake.renderOrder = 4;
  sauna.group.add(wake);

  // Water thrown up where the swimmer enters.
  const drops = [];
  const dropGeo = new THREE.SphereGeometry(0.055, 6, 5);
  const dropMat = look.flat('#e8f7f5');
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(dropGeo, dropMat);
    m.visible = false;
    sauna.group.add(m);
    const a = i * 2.399;
    drops.push({ m, dx: Math.cos(a) * (0.55 + (i % 4) * 0.28), dz: Math.sin(a) * (0.55 + (i % 4) * 0.28), up: 2.3 + (i % 3) * 0.7 });
  }

  // Steam from the flue: a soft event of drifting puffs, never solid.
  const puffs = [];
  const puffGeo = new THREE.IcosahedronGeometry(0.2, 1);
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(puffGeo, look.flat('#efe6db', { transparent: true, opacity: 0, depthWrite: false }));
    m.renderOrder = 5;
    sauna.group.add(m);
    puffs.push(m);
  }

  return {
    diver: plunger.root,
    flip: { takeoff: TAKEOFF, splash: SPLASH, surface: SURFACE },
    steamMats: puffs.map((m) => m.material),
    actors: [
      { name: 'diver', p: plunger, moving: true },
      { name: 'downpour', p: showerer, moving: true },
      ...guests.map((g, i) => ({ name: ['bench hat', 'bench bun', 'rail A', 'rail B', 'chair phone', 'chair cup', 'lounge A', 'lounge B', 'talk A', 'talk B'][i], p: g.p, moving: false })),
    ],
    update(rawT, roofOpen = false) {
      const t = ((rawT % CYCLE) + CYCLE) % CYCLE;
      const found = BEATS.findIndex((b) => t >= b.t0 && t < b.t1);
      const index = found < 0 ? BEATS.length - 1 : found;
      const beat = BEATS[index];
      const u = (t - beat.t0) / (beat.t1 - beat.t0);
      const linear = ['walk', 'climb', 'stairs', 'fly'].includes(beat.mode);
      const e = linear ? u : smooth(u);
      const x = lerp(beat.from[0], beat.to[0], e);
      let y = lerp(beat.from[1], beat.to[1], e);
      let z = lerp(beat.from[2], beat.to[2], e);
      if (beat.mode === 'swim') y += Math.sin(t * 2.6) * 0.03;
      // Keeps swinging feet on top of the boards, easing in and out at the ladder and edge.
      if (['walk', 'step', 'stairs'].includes(beat.mode)) {
        let lift = 0.03;
        if (beat.from === L) lift *= smooth(u);
        if (beat.to === EDGE) lift *= 1 - smooth(u);
        y += lift;
      }
      const turn = beat.mode === 'walk' || beat.mode === 'swim' ? smooth(u / 0.3) : smooth(u);
      // He stands with his heels at the edge and his back to the river.
      let bodyYaw = lerp(beat.y0, beat.y1, turn);
      if (t < SURFACE) bodyYaw = Math.PI;
      if (beat.mode === 'surface') bodyYaw = lerp(Math.PI, 0, smooth(u));
      if (t >= 23.3) bodyYaw = Math.PI * smooth((t - 23.3) / 0.6);

      // Every move crossfades out of the last one, so no joint can snap.
      let divePose = diverPose(beat, t);
      const since = t - beat.t0;
      if (since < BLEND && beat.mode !== 'fly' && beat.mode !== 'idle') {
        const prev = BEATS[(index + BEATS.length - 1) % BEATS.length];
        divePose = mixPose(diverPose(prev, prev.t1 - 0.001), divePose, smooth(since / BLEND));
      }
      // His arms hang a touch wider around the belly.
      const narrow = ['stairs', 'climb', 'step', 'walk'].includes(beat.mode);
      setPose(plunger, { ...divePose, azl: narrow ? -0.01 : (divePose.azl ?? -0.09) - 0.1, azr: narrow ? 0.01 : (divePose.azr ?? 0.09) + 0.1 });

      const spin = plunger.root.rotation;
      if (beat.mode === 'fly') {
        // Airborne: place the feet from the center of mass and the conserved spin.
        const tau = t - TAKEOFF;
        spin.set(FLIP.angle(u), Math.PI, 0);
        const com = new THREE.Vector3(lerp(FLIP.start.x, ENTRY[0], u), FLIP.start.y + LAUNCH * tau - 0.5 * GRAVITY * tau * tau, lerp(FLIP.start.z, ENTRY[2], u));
        plunger.root.position.copy(com.sub(comIn(flipTuck(u)).applyEuler(spin)));
      } else if (beat.mode === 'idle' && t < TAKEOFF) {
        // Planted: the soles stay on the boards while the body loads and tips back.
        spin.set(DRIVE_TILT * smooth((t - 0.74) / (TAKEOFF - 0.74)), Math.PI, 0);
        const planted = sole(divePose.hl, divePose.kl).sub(SOLE_STAND).applyEuler(spin);
        plunger.root.position.set(EDGE[0], EDGE[1], EDGE[2]).sub(planted);
      } else if (beat.mode === 'plunge') {
        spin.set(0, Math.PI, 0);
        plunger.root.position.set(ENTRY[0], ENTRY[1] * (1 - (1 - u) * (1 - u)), ENTRY[2]);
      } else {
        spin.set(0, bodyYaw, 0);
        plunger.root.position.set(x, y, z);
      }
      plunger.root.visible = !(roofOpen && beat.roof);

      // Idle life on loop-safe frequencies: breathing, glances, and talking gestures.
      const w = Math.PI / 12;
      for (const g of guests) {
        const breath = Math.sin(rawT * w * 6 + g.phase);
        const talk = g.talk ? Math.max(0, Math.sin(rawT * w * 5 + g.phase)) ** 2 : 0;
        const base = g.pose;
        setPose(g.p, {
          ...base,
          lean: (base.lean || 0) + breath * 0.012,
          hy: (base.hy || 0) + Math.sin(rawT * w * 2 + g.phase) * (g.look ?? 0.08),
          hx: (base.hx || 0) + Math.sin(rawT * w * 4 + g.phase) * 0.025 + talk * 0.05,
          ar: (base.ar ?? 0) - talk * (g.talk || 0),
          er: (base.er ?? -0.14) - talk * (g.talk || 0) * 0.8,
          al: (base.al ?? 0) + Math.sin(rawT * w * 3 + g.phase) * 0.018,
        });
        g.p.root.position.y = g.at[1] + breath * 0.003;
      }

      // Downpour: pull the cord, gasp, hands to the hair, shake it off.
      const tug = smooth((t - 9.7) / 0.5) * (1 - smooth((t - 10.55) / 0.3));
      const brace = smooth((t - 10.4) / 0.25) * (1 - smooth((t - 12.3) / 0.45));
      const shiver = Math.sin(t * 15) * brace;
      setPose(showerer, {
        al: -2.2 * tug * (1 - brace) - 2.42 * brace,
        ar: -2.42 * brace + Math.sin(t * w * 5) * 0.03,
        el: -0.2 - 1.55 * brace,
        er: -0.14 - 1.62 * brace,
        azl: -0.09 - 0.42 * brace,
        azr: 0.09 + 0.42 * brace,
        kl: 0.05 + brace * 0.12,
        kr: 0.05 + brace * 0.12,
        lean: -0.05 * brace + shiver * 0.012,
        hx: -0.3 * brace + 0.04 * (1 - brace),
        hy: 0.32 * tug + shiver * 0.035,
      });
      showerer.root.position.y = DK + 0.14 - brace * 0.025 + shiver * 0.006;

      // Rings and thrown water at the moment of entry, a small ring at the ladder.
      const burst = (m, t0, dur, px, pz, peak) => {
        const k = clamp((t - t0) / dur);
        const on = t >= t0 && t < t0 + dur;
        m.visible = on;
        if (!on) return;
        const s = 0.3 + k * 2.1;
        m.scale.set(s, 1, s);
        m.position.set(px, 0.05, pz);
        m.material.opacity = peak * (1 - k) * (1 - k);
      };
      if (t >= LADDER - 0.2 && t < LADDER + 1.5) burst(ring, LADDER, 1.3, IN[0], IN[2], 0.7);
      else burst(ring, SPLASH, 1.9, ENTRY[0], ENTRY[2], 0.95);
      for (const d of drops) {
        const k = (t - SPLASH) / 0.85;
        d.m.visible = k > 0 && k < 1;
        if (d.m.visible) {
          const h = d.up * 0.85 * k - 4.9 * (0.85 * k) ** 2;
          d.m.position.set(ENTRY[0] + d.dx * k, Math.max(0.03, h), ENTRY[2] + d.dz * k);
        }
      }
      if (beat.mode === 'swim') {
        const k = (t * 0.8) % 1;
        wake.visible = true;
        wake.scale.set(0.35 + k * 0.7, 1, 0.35 + k * 0.7);
        wake.position.set(x, 0.05, z);
        wake.material.opacity = 0.65 * (1 - k);
      } else {
        wake.visible = false;
      }

      // Steam stays on the absolute clock of the loop, so the seam is exact.
      puffs.forEach((m, i) => {
        const k = ((rawT / 6 + i / puffs.length) % 1 + 1) % 1;
        const s = 0.42 + k * 1.75;
        m.scale.setScalar(s);
        m.position.set(
          sauna.flueTop.x + Math.sin(k * 5 + i) * 0.1 * (1 + k * 2) + k * 0.65,
          sauna.flueTop.y + k * 2.7,
          sauna.flueTop.z - k * 0.4,
        );
        m.material.opacity = 0.42 * Math.sin(Math.min(1, k * 7) * PI2) * (1 - k) ** 1.4;
      });
    },
  };
}
