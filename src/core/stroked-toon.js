// Optional stroked-toon / illustrated-miniature preset, Three.js r170.
// Apply ONLY after the project's style-choice confirmation (see SKILL.md).
// This replaces PixelPost; it does not supply scene geometry, lights, or UI.
// Project change: an optional pixel mode renders the same toon scene and outlines
// once into a low-resolution target, then scales it up with nearest filtering.
import * as THREE from 'three';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';

export const STROKED_TOON_DEFAULTS = Object.freeze({
  bands: Object.freeze([68, 122, 184, 246]),
  ink: 0x27231e,
  thickness: 0.0032,
  maxDpr: 2,
  camera: Object.freeze({ fov: 26, azimuth: 38, elevation: 27.5 }),
  // Calibrate against screenshots, not as a universal physical lighting rig.
  lighting: Object.freeze({ key: 2.55, hemisphere: 1.55, fill: 0.72 }),
});

export function makeToonRamp(bands = STROKED_TOON_DEFAULTS.bands) {
  if (bands.length !== 4 || !bands.every(v => Number.isInteger(v) && v >= 0 && v <= 255)) {
    throw new Error('stroked-toon requires four byte-valued shade steps');
  }
  const ramp = new THREE.DataTexture(new Uint8Array(bands), 4, 1, THREE.RedFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.generateMipmaps = false;
  ramp.needsUpdate = true;
  return ramp;
}

export function setToonOutline(material, enabled = true, thickness = 0.0032) {
  material.userData.outlineParameters = { visible: enabled, thickness };
  return material;
}

export function createStrokedToon(renderer, {
  bands = STROKED_TOON_DEFAULTS.bands,
  ink = STROKED_TOON_DEFAULTS.ink,
  thickness = STROKED_TOON_DEFAULTS.thickness,
  maxDpr = STROKED_TOON_DEFAULTS.maxDpr,
  dpr = globalThis.devicePixelRatio || 1,
} = {}) {
  const ramp = makeToonRamp(bands);
  renderer.setPixelRatio(Math.min(Math.max(dpr, 1), maxDpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Requires alpha:true when creating WebGLRenderer; CSS supplies the paper.
  renderer.setClearColor(0x000000, 0);
  const inkColor = new THREE.Color(ink);
  const effect = new OutlineEffect(renderer, {
    defaultThickness: thickness,
    defaultColor: inkColor.toArray(),
    defaultAlpha: 1,
    defaultKeepAlive: true,
  });
  const ownedMaterials = new Set();
  function toon(color, { outline = true, stroke = thickness, ...options } = {}) {
    const material = new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...options });
    setToonOutline(material, outline, stroke);
    ownedMaterials.add(material);
    return material;
  }
  function flat(color, options = {}) {
    const material = new THREE.MeshBasicMaterial({ color, ...options });
    setToonOutline(material, false);
    ownedMaterials.add(material);
    return material;
  }
  // Pixel mode: one low-res pass, then a single nearest-neighbour upscale.
  const target = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
    depthBuffer: true, stencilBuffer: false, colorSpace: THREE.SRGBColorSpace,
  });
  target.texture.generateMipmaps = false;
  const screenMat = new THREE.MeshBasicMaterial({ map: target.texture, depthTest: false, depthWrite: false, transparent: true });
  const screen = new THREE.Scene();
  screen.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), screenMat));
  const screenCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const size = new THREE.Vector2();
  let pixelRows = 0;
  // Outlines are projected, so they need to be thicker to survive the low-res grid.
  function scaleOutlines(k) {
    for (const m of ownedMaterials) {
      const o = m.userData.outlineParameters;
      if (!o) continue;
      o.base ??= o.thickness;
      o.thickness = o.base * k;
    }
  }

  return {
    preset: 'stroked-toon', effect, ramp, toon, flat,
    get pixelRows() { return pixelRows; },
    // rows = 0 turns pixel mode off; otherwise the image is this many pixels tall.
    setPixel(rows = 0, outlineScale = 1) {
      pixelRows = Math.max(0, Math.round(rows));
      scaleOutlines(pixelRows ? outlineScale : 1);
    },
    // Use this instead of renderer.render / PixelPost.render, not after them.
    render(scene, camera) {
      if (!pixelRows) { effect.render(scene, camera); return; }
      renderer.getSize(size);
      const h = pixelRows, w = Math.max(1, Math.round(h * size.x / Math.max(1, size.y)));
      if (target.width !== w || target.height !== h) target.setSize(w, h);
      const previous = renderer.getRenderTarget();
      try {
        renderer.setRenderTarget(target); renderer.clear(); effect.render(scene, camera);
        renderer.setRenderTarget(previous); renderer.clear(); renderer.render(screen, screenCam);
      } finally { renderer.setRenderTarget(previous); }
    },
    // Re-create for a preset switch; restore previous renderer settings there.
    // OutlineEffect r170 has no public dispose(); renderer lifetime owns its cache.
    dispose() {
      for (const material of ownedMaterials) material.dispose();
      ownedMaterials.clear();
      ramp.dispose();
      target.dispose();
      screenMat.dispose();
    },
  };
}
