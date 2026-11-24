// Shared colours and a small batching kit: parts are authored one by one,
// then merged per material so the scene stays cheap to draw and outline.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const C = {
  black: '#30353a', char: '#272b2f', cedarPale: '#e8c88f', batten: '#3d4349', frame: '#1f2327',
  cedar: '#c98f55', cedarLight: '#dcaa6d', cedarDark: '#9c6a3d', cedarDeep: '#6f4a2c',
  steel: '#4a5056', steelLight: '#7c858c', galv: '#b4bdc2', cable: '#d7dde0', membrane: '#7d8084',
  led: '#ffd894', ember: '#ff8a45', ring: '#ee5a3a', white: '#f3eee3',
  water: '#4f7f8c', waterDeep: '#3f6875', ripple: '#9fcbd0', peach: '#f6b98a', rose: '#e58f7c',
  base: '#2b3238', baseLight: '#3b444b', grass: '#56755a', bank: '#7a6a55', rock: '#747a7c', rockDark: '#585e61',
  pine: '#2f5a50', pineLight: '#3f7262', trunk: '#54392a', piling: '#5a4636',
  dock: '#8a735c', dockLight: '#a08870', dockDark: '#6d5a48',
  hull: '#e9e4d8', navy: '#2d4560', homeTeal: '#6f9c94', homeRoof: '#57606a', glow: '#ffcf85',
  skinA: '#eac09d', skinB: '#b97d55', skinC: '#dfab82', skinD: '#71452e', hair: '#2c231e', hairB: '#62452f',
  towel: '#efe7d6', suitA: '#2d4560', suitB: '#d9503c', suitC: '#267e78', felt: '#d8c8a8',
};

export const hash = (n) => {
  const v = Math.sin(n * 127.1) * 43758.5453;
  return v - Math.floor(v);
};
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (u) => { const k = clamp(u); return k * k * (3 - 2 * k); };
export const lerp = (a, b, k) => a + (b - a) * k;

export function createKit(look) {
  const cache = new Map();
  const mat = (color, stroke = 0.0024) => {
    const key = `${color}|${stroke}`;
    if (!cache.has(key)) cache.set(key, look.toon(color, { outline: stroke > 0, stroke: stroke || 0.001 }));
    return cache.get(key);
  };

  // With ?qa in the URL, remember each solid part so the clipping audit can test it.
  const qaOn = typeof location !== 'undefined' && new URLSearchParams(location.search).has('qa');
  const qaParts = [];

  function batch(parent, { actor = false } = {}) {
    const buckets = new Map();
    const d = new THREE.Object3D();

    function geo(color, source, x = 0, y = 0, z = 0, o = {}) {
      const stroke = o.stroke ?? 0.0024;
      const cast = o.cast ?? stroke > 0;
      d.position.set(x, y, z);
      d.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
      d.scale.set(o.sx || 1, o.sy || 1, o.sz || 1);
      d.updateMatrix();
      if (qaOn && !actor && o.cast !== false) {
        if (!source.boundingBox) source.computeBoundingBox();
        qaParts.push({ parent, matrix: d.matrix.clone(), min: source.boundingBox.min.clone(), max: source.boundingBox.max.clone(), kind: source.type, color });
      }
      const g = source.index ? source.toNonIndexed() : source.clone();
      g.applyMatrix4(d.matrix);
      for (const name of Object.keys(g.attributes)) {
        if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
      }
      const key = `${color}|${stroke}|${cast}`;
      if (!buckets.has(key)) buckets.set(key, { color, stroke, cast, parts: [] });
      buckets.get(key).parts.push(g);
    }

    const box = (color, w, h, dp, x, y, z, o = {}) => geo(
      color,
      o.r ? new RoundedBoxGeometry(w, h, dp, 1, o.r) : new THREE.BoxGeometry(w, h, dp),
      x, y, z, o,
    );
    const cyl = (color, r, h, x, y, z, o = {}) => geo(
      color, new THREE.CylinderGeometry(o.rt ?? r, r, h, o.n ?? 10), x, y, z, o,
    );

    function commit() {
      for (const b of buckets.values()) {
        const mesh = new THREE.Mesh(mergeGeometries(b.parts, false), mat(b.color, b.stroke));
        mesh.castShadow = b.cast;
        mesh.receiveShadow = true;
        parent.add(mesh);
        b.parts.forEach((p) => p.dispose());
      }
      buckets.clear();
    }
    return { geo, box, cyl, commit };
  }

  return { mat, batch, qaParts };
}
