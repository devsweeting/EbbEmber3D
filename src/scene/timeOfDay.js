// Morning, Dusk and Night: one set of values per time, crossfaded together.
import * as THREE from 'three';
import { C, lerp, smooth } from './kit.js';

export const TIMES = ['morning', 'dusk', 'night'];

const PRESETS = {
  morning: {
    hemiSky: '#e4f2ff', hemiGround: '#c4b297', hemi: 2.15,
    sunColor: '#fff4df', sun: 3.0, sunPos: [-9, 23, 13],
    fillColor: '#d9ecff', fill: 0.8,
    water: '#5fb3c6', ripple: '#d9f4f5', pathA: '#f4fbf7', pathB: '#c7eef0', deep: '#3f94a8',
    glow: '#7f9eac', emissive: 0, ember: 0.25,
    glass: '#d8f1f7', glassOpacity: 0.16, bulb: '#e8e2d2', steam: '#ffffff', signs: 1,
    pool: 0, hearth: 1.2, lamp: 0, deck: 0, river: 0, roof: 0, night: 0, sunPath: 0,
  },
  dusk: {
    hemiSky: '#a58bd8', hemiGround: '#a84f5e', hemi: 1.72,
    sunColor: '#ff9d5c', sun: 3.05, sunPos: [-19, 7.6, 10],
    fillColor: '#7f83e8', fill: 0.82,
    water: '#3c4a88', ripple: '#f4a6bd', pathA: '#ffc96f', pathB: '#ff7566', deep: '#2f3873',
    glow: '#ffd27d', emissive: 0.85, ember: 1.1,
    glass: '#ffb27c', glassOpacity: 0.25, bulb: '#ffe09a', steam: '#ffc9bf', signs: 1,
    pool: 1.25, hearth: 10, lamp: 15, deck: 5, river: 3, roof: 0, night: 0, sunPath: 1,
  },
  night: {
    hemiSky: '#526a9a', hemiGround: '#1c2030', hemi: 1.15,
    sunColor: '#a9c0ec', sun: 0.62, sunPos: [11, 20, 9],
    fillColor: '#5a76ad', fill: 0.34,
    water: '#25435c', ripple: '#6f93ad', pathA: '#ffd089', pathB: '#f0a662', deep: '#1a3249',
    glow: '#ffd98f', emissive: 1.5, ember: 1.6,
    glass: '#ffc982', glassOpacity: 0.3, bulb: '#fff1bd', steam: '#aab3c8', signs: 0.72,
    pool: 2.05, hearth: 15, lamp: 34, deck: 26, river: 13, roof: 7, night: 1, sunPath: 0,
  },
};

const COLOR_KEYS = ['hemiSky', 'hemiGround', 'sunColor', 'fillColor', 'water', 'ripple', 'pathA', 'pathB', 'deep', 'glow', 'glass', 'bulb', 'steam'];
const NUMBER_KEYS = ['hemi', 'sun', 'fill', 'emissive', 'ember', 'glassOpacity', 'signs', 'pool', 'hearth', 'lamp', 'deck', 'river', 'roof', 'night', 'sunPath'];

for (const preset of Object.values(PRESETS)) {
  for (const key of COLOR_KEYS) preset[key] = new THREE.Color(preset[key]);
  preset.sunPos = new THREE.Vector3(...preset.sunPos);
}

export function createTimeOfDay({ hemi, sun, fill, kit, env, sauna, site, cast, skies }) {
  const led = kit.mat(C.led, 0);
  const glow = kit.mat(C.glow, 0);
  const ember = kit.mat(C.ember, 0);
  const water = kit.mat(C.water, 0.0016);
  led.emissive.set('#ffc777');
  glow.emissive.set('#ffbd69');
  ember.emissive.set('#ff6a26');

  const now = {};
  for (const key of COLOR_KEYS) now[key] = new THREE.Color();
  now.sunPos = new THREE.Vector3();
  let from = PRESETS.dusk, to = PRESETS.dusk, progress = 1, name = 'dusk';

  function apply() {
    const k = smooth(progress);
    for (const key of COLOR_KEYS) now[key].lerpColors(from[key], to[key], k);
    for (const key of NUMBER_KEYS) now[key] = lerp(from[key], to[key], k);
    now.sunPos.lerpVectors(from.sunPos, to.sunPos, k);

    hemi.color.copy(now.hemiSky);
    hemi.groundColor.copy(now.hemiGround);
    hemi.intensity = now.hemi;
    sun.color.copy(now.sunColor);
    sun.intensity = now.sun;
    sun.position.copy(now.sunPos);
    fill.color.copy(now.fillColor);
    fill.intensity = now.fill;

    water.color.copy(now.water);
    glow.color.copy(now.glow);
    led.emissiveIntensity = now.emissive;
    glow.emissiveIntensity = now.emissive;
    ember.emissiveIntensity = now.ember;

    env.setTime(now);
    sauna.setTime(now);
    site.setTime(now);
    for (const m of cast.steamMats) m.color.copy(now.steam);
  }

  function showSky(next) {
    for (const [key, el] of Object.entries(skies)) el.classList.toggle('on', key === next);
  }

  apply();
  showSky(name);

  return {
    get name() { return name; },
    set(next, instant = false) {
      if (!PRESETS[next]) return;
      if (next === name && (progress >= 1 || !instant)) return;
      // Start from what is on screen, so changing mid-fade never jumps.
      const held = { ...now };
      for (const key of COLOR_KEYS) held[key] = now[key].clone();
      held.sunPos = now.sunPos.clone();
      from = held;
      to = PRESETS[next];
      progress = instant ? 1 : 0;
      name = next;
      showSky(next);
      apply();
    },
    tick(dt) {
      if (progress >= 1) return;
      progress = Math.min(1, progress + dt / 0.9);
      apply();
    },
  };
}
