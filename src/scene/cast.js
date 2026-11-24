// Guests and the 24 s sweat, plunge, repeat loop. Everything is a function of t.
import * as THREE from 'three';
import { C, clamp, lerp, smooth } from './kit.js';
import { DECK } from './sauna.js';
import { DK, SHOWER } from './site.js';
import { createGuest as person, setPose } from './guest.js';

// Two 24 s cycles: the first leaves the roof with a backflip, the second with a jump.
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
const IN = [-6.52, -1.22, 1.4];
const L = [-6.52, DECK, 1.4];
const B = [-5.62, DECK, 1.4];
const W1 = [-5.35, DECK, 1.99];
const W2 = [4.56, DECK, 1.99];
const W3 = [4.95, DECK, 2.2];
const W4 = [5.6, DECK, 2.2];
const W5 = [5.6, DECK, -2.25];
const FOOT = [4.96, DECK, -2.2];
const TOP = [4.96, ROOF_Y + 0.1, 0.97];
const LANDING = [4.95, ROOF_Y, 1.43];
const R1 = [4.0, ROOF_Y, 1.43];
const R2 = [3.4, ROOF_Y, -0.7];
const R3 = [-3.2, ROOF_Y, -0.7];
const R0 = [-4.15, ROOF_Y, 1.6];
const PI2 = Math.PI / 2;
const heading = (a, b) => Math.atan2(b[0] - a[0], b[2] - a[2]);

// Beat table in absolute seconds within one 24 s cycle.
const BEATS = (() => {
  const raw = [
    [0, 1.0, EDGE, EDGE, 'idle', 0, true],
    [1.0, 2.2, EDGE, ENTRY, 'fly', 0, false],
    [2.2, 2.65, ENTRY, UP, 'surface', 0, false],
    [2.65, 3.75, UP, AROUND, 'swim', null, false],
    [3.75, 4.7, AROUND, IN, 'swim', null, false],
    [4.7, 6.25, IN, L, 'climb', PI2, false],
    [6.25, 6.75, L, B, 'step', null, false],
    [6.75, 7.1, B, W1, 'walk', null, false],
    [7.1, 11.6, W1, W2, 'walk', null, false],
    [11.6, 11.85, W2, W3, 'walk', null, false],
    [11.85, 12.25, W3, W4, 'walk', null, false],
    [12.25, 14.0, W4, W5, 'walk', null, false],
    [14.0, 14.75, W5, FOOT, 'step', 0, false],
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

function diverPose(b, tt, isJump) {
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
    if (isJump) {
      const k = Math.sin(u * Math.PI);
      return { hl: -0.5 * k, hr: 0.35 * k, kl: 0.04 + 0.5 * k, kr: 0.04 + 0.25 * k, al: -2.3 * k, ar: -1.9 * k, el: -0.2, er: -0.2, azl: -0.1 - 0.35 * k, azr: 0.1 + 0.35 * k, hx: -0.2 * k };
    }
    const tuck = smooth(clamp((u - 0.1) / 0.2)) * (1 - smooth(clamp((u - 0.66) / 0.2)));
    const open = u < 0.5 ? -2.75 : -0.12;
    const arm = tuck * -1.05 + (1 - tuck) * open;
    return { hl: -2.05 * tuck, hr: -2.05 * tuck, kl: 0.04 + 2.15 * tuck, kr: 0.04 + 2.15 * tuck, al: arm, ar: arm, el: -0.15 - 1.05 * tuck, er: -0.15 - 1.05 * tuck, azl: -0.12, azr: 0.12, lean: 0.42 * tuck, hx: 0.32 * tuck - 0.12 * (1 - tuck) };
  }
  if (b.mode === 'swim' || b.mode === 'surface') {
    const ph = tt * 4.2;
    return { hl: Math.sin(ph) * 0.3, hr: -Math.sin(ph) * 0.3, kl: 0.3, kr: 0.3, al: wrapAngle(-ph), ar: wrapAngle(-ph - Math.PI), el: -0.28, er: -0.28, azl: -0.2, azr: 0.2, lean: 0.22, tw: Math.sin(ph) * 0.14, hx: -0.28 };
  }
  if (b.mode === 'step') {
    const s = Math.sin(u * Math.PI * 2);
    return { hl: s * 0.3, hr: -s * 0.3, kl: 0.25, kr: 0.25, al: -0.5, ar: -0.5, el: -0.4, er: -0.4, lean: 0.1 };
  }
  // Ready at the edge: a small crouch and arm swing just before leaving.
  const crouch = tt < 1 ? smooth((tt - 0.45) / 0.55) : 0;
  const a = Math.sin(tt * (Math.PI / 12) * 6) * 0.035;
  return { hl: -0.42 * crouch, hr: -0.42 * crouch, kl: 0.05 + 0.82 * crouch, kr: 0.05 + 0.82 * crouch, al: a + 0.75 * crouch, ar: -a + 0.75 * crouch, lean: 0.36 * crouch, hx: 0.12 * crouch };
}

export function buildCast(sauna, kit, look, site) {
  const plunger = person(kit, { skin: C.skinA, hair: C.hair, hairStyle: 'short', suit: { type: 'trunks', a: C.suitB, b: C.white } });
  sauna.group.add(plunger.root);

  const guests = [
    // Inside on the benches: felt hat upstairs, elbows on knees below.
    { p: person(kit, { skin: C.skinB, hair: C.hair, hat: 'felt', beard: true, suit: { type: 'trunks', a: C.suitC, b: C.towel } }), parent: sauna.group, at: [-1.45, DECK + 0.94 - 0.82, -1.05], yaw: 0.12, pose: { ...SIT, lean: -0.08, hx: -0.12 }, phase: 0.4, look: 0.12 },
    { p: person(kit, { skin: C.skinC, hair: C.hairB, hairStyle: 'bun', build: 'f', suit: { type: 'onepiece', a: C.suitA } }), parent: sauna.group, at: [-0.42, DECK + 0.49 - 0.82, -0.52], yaw: -0.1, pose: { ...SIT, lean: 0.34, al: -0.62, ar: -0.62, el: -1.0, er: -1.0, hx: 0.16 }, phase: 2.1, look: 0.06 },
    // Porch bench, cooling off in a towel and looking at the river.
    { p: person(kit, { skin: C.skinD, hair: C.hair, hairStyle: 'buzz', towel: 'shoulders', towelStripe: C.suitB, suit: { type: 'trunks', a: C.navy, b: C.suitB } }), parent: sauna.group, at: [-4.72, DECK + 0.47 - 0.82, -1.43], yaw: -PI2, pose: { ...SIT, lean: -0.05, hy: 0.28 }, phase: 1.2, look: 0.16 },
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
  [0.15, 0.127, 0.195, 0, 0, 0.218, 0.218, 0.372, 0.372, 0, 0].forEach((drop, i) => {
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
    actors: [
      { name: 'diver', p: plunger, moving: true },
      { name: 'downpour', p: showerer, moving: true },
      ...guests.map((g, i) => ({ name: ['bench hat', 'bench bun', 'porch', 'rail A', 'rail B', 'chair phone', 'chair cup', 'lounge A', 'lounge B', 'talk A', 'talk B'][i], p: g.p, moving: false })),
    ],
    update(rawT, roofOpen = false) {
      const t = ((rawT % CYCLE) + CYCLE) % CYCLE;
      const isJump = ((rawT % LOOP) + LOOP) % LOOP >= CYCLE;
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
      // A real launch: he rises off the edge first, then gravity takes over.
      if (beat.mode === 'fly') y = beat.from[1] + (beat.to[1] - beat.from[1]) * u * u + (isJump ? 2.6 : 2.3) * u * (1 - u) - 0.08 * (1 - smooth(u / 0.14));
      // Keeps swinging feet on top of the boards, easing in and out at the ladder and edge.
      if (['walk', 'step', 'stairs'].includes(beat.mode)) {
        let lift = 0.03;
        if (beat.from === L) lift *= smooth(u);
        if (beat.to === EDGE) lift *= 1 - smooth(u);
        y += lift;
      }
      const turn = beat.mode === 'walk' || beat.mode === 'swim' ? smooth(u / 0.3) : smooth(u);
      // For the backflip he stands with his heels at the edge and his back to the river.
      let bodyYaw = lerp(beat.y0, beat.y1, turn);
      if (t < 1 || beat.mode === 'fly') bodyYaw = isJump ? 0 : Math.PI;
      if (beat.mode === 'surface' && !isJump) bodyYaw = lerp(Math.PI, 0, smooth(u));
      if (t >= 23.3) bodyYaw = (isJump ? Math.PI : 0) * smooth((t - 23.3) / 0.6);
      plunger.root.rotation.set(0, bodyYaw, 0);

      // The flip turns one full backward rotation around the hips and enters feet-first.
      let tip = 0;
      if (beat.mode === 'fly') tip = isJump ? Math.sin(u * Math.PI) * -0.1 : smooth(clamp((u - 0.06) / 0.78)) * Math.PI * 2;
      if (tip) {
        const c = 0.95;
        plunger.root.rotation.x = tip;
        y += c - c * Math.cos(tip);
        z -= c * Math.sin(tip);
      }
      if (beat.mode === 'idle' && t < 1) y -= 0.08 * smooth((t - 0.45) / 0.55);
      plunger.root.position.set(x, y, z);
      plunger.root.visible = !(roofOpen && beat.roof);

      // Every move crossfades out of the last one, so no joint can snap.
      let divePose = diverPose(beat, t, isJump);
      const since = t - beat.t0;
      if (since < BLEND) {
        const prev = BEATS[(index + BEATS.length - 1) % BEATS.length];
        divePose = mixPose(diverPose(prev, prev.t1 - 0.001, index === 0 ? !isJump : isJump), divePose, smooth(since / BLEND));
      }
      setPose(plunger, divePose);

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
      if (t >= 4.4 && t < 6.2) burst(ring, 4.6, 1.3, IN[0], IN[2], 0.7);
      else burst(ring, 2.02, 1.9, ENTRY[0], ENTRY[2], 0.95);
      for (const d of drops) {
        const k = (t - 2.02) / 0.85;
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
