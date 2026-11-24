// Run in the page at ?qa: const m = await import('/dist/clipping-audit.js'); await m.run(window.__diorama)
// Samples real posed vertices against every solid part, and measures motion.
export async function run(d, { dt = 1 / 30, tol = 0.03 } = {}) {
  const T = d.THREE;
  d.setRoof(false);
  d.evaluate(0);
  d.scene.updateMatrixWorld(true);
  const parts = d.kit.qaParts.filter((q) => q.kind !== 'TorusGeometry').map((q) => {
    const size = q.max.clone().sub(q.min);
    return { ...q, size, world: new T.Matrix4(), inv: new T.Matrix4(), stamp: -1, sx: new T.Vector3().setFromMatrixColumn(q.matrix, 0).length(), sy: new T.Vector3().setFromMatrixColumn(q.matrix, 1).length(), sz: new T.Vector3().setFromMatrixColumn(q.matrix, 2).length() };
  }).filter((q) => Math.min(q.size.x * q.sx, q.size.y * q.sy, q.size.z * q.sz) > 0.012);
  const grid = new Map();
  const key = (x, z) => `${Math.floor(x)},${Math.floor(z)}`;
  const v = new T.Vector3();
  parts.forEach((q, i) => {
    q.world.multiplyMatrices(q.parent.matrixWorld, q.matrix);
    const b = new T.Box3(q.min.clone(), q.max.clone()).applyMatrix4(q.world); // clones: Box3 keeps references
    q.top = b.max.y; q.wb = b;
    for (let x = Math.floor(b.min.x - 0.1); x <= Math.floor(b.max.x + 0.1); x++) for (let z = Math.floor(b.min.z - 0.1); z <= Math.floor(b.max.z + 0.1); z++) {
      const k = `${x},${z}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i);
    }
  });
  const labelOf = (o) => { let n = o; while (n && !n.name) n = n.parent; return n ? n.name : '?'; };
  const actors = d.cast.actors.map((a) => {
    const pts = [];
    a.p.root.traverse((m) => {
      if (!m.isMesh) return;
      const pos = m.geometry.attributes.position, step = Math.max(1, Math.floor(pos.count / 70));
      for (let i = 0; i < pos.count; i += step) pts.push({ m, l: new T.Vector3().fromBufferAttribute(pos, i), part: labelOf(m) });
    });
    const joints = [];
    a.p.root.traverse((o) => { if (o.isGroup && o.name) joints.push({ o, q: new T.Quaternion(), has: false }); });
    return { ...a, pts, joints, last: null, feetLast: {}, maxSpeed: 0, maxSpeedT: 0, maxTurn: 0, maxTurnT: 0, maxTurnJoint: '', slip: 0, slipT: 0, float: 0, floatT: 0 };
  });
  const hits = new Map();
  const local = new T.Vector3();
  let stamp = 0, samples = 0;
  const depthIn = (q, p) => {
    if (q.stamp !== stamp) { q.world.multiplyMatrices(q.parent.matrixWorld, q.matrix); q.inv.copy(q.world).invert(); q.stamp = stamp; }
    local.copy(p).applyMatrix4(q.inv);
    if (local.x < q.min.x || local.x > q.max.x || local.y < q.min.y || local.y > q.max.y || local.z < q.min.z || local.z > q.max.z) return 0;
    const faces = [(local.y - q.min.y) * q.sy, (q.max.y - local.y) * q.sy];
    if (/Cylinder|Cone/.test(q.kind)) {
      const r = Math.max(q.max.x, q.max.z), rr = Math.hypot(local.x, local.z);
      if (rr > r) return 0;
      faces.push((r - rr) * Math.max(q.sx, q.sz));
    } else if (/Sphere|Icosa|Dodeca/.test(q.kind)) {
      const r = Math.max(q.max.x, q.max.y, q.max.z), rr = local.length();
      if (rr > r) return 0;
      return (r - rr) * Math.min(q.sx, q.sy, q.sz);
    } else {
      faces.push((local.x - q.min.x) * q.sx, (q.max.x - local.x) * q.sx, (local.z - q.min.z) * q.sz, (q.max.z - local.z) * q.sz);
    }
    return Math.min(...faces);
  };
  const frames = Math.round(d.LOOP / dt);
  for (let f = 0; f <= frames; f++) {
    const t = f * dt;
    d.evaluate(t); d.scene.updateMatrixWorld(true); stamp++;
    for (const a of actors) {
      const r = new T.Vector3().setFromMatrixPosition(a.p.root.matrixWorld);
      if (a.last) { const sp = r.distanceTo(a.last) / dt; if (sp > a.maxSpeed) { a.maxSpeed = sp; a.maxSpeedT = t; } }
      a.last = r;
      for (const j of a.joints) {
        const q = j.o.quaternion;
        if (j.has) { const w = 2 * Math.acos(Math.min(1, Math.abs(q.dot(j.q)))) / dt; if (w > a.maxTurn && !(a.name === 'diver' && j.o.name === 'pelvis' && (t % 24) > 0.7 && (t % 24) < 3.2)) { a.maxTurn = w; a.maxTurnT = t; a.maxTurnJoint = j.o.name; } }
        j.q.copy(q); j.has = true;
      }
      if (!a.moving && f % 15 !== 0) continue;
      if (!a.p.root.visible) continue;
      let low = { y: 1e9 };
      for (const s of a.pts) {
        v.copy(s.l).applyMatrix4(s.m.matrixWorld); samples++;
        if (v.y < low.y && /shin/.test(s.part)) low = { y: v.y, x: v.x, z: v.z, part: s.part };
        if (v.y < -0.02) continue;
        const cell = grid.get(key(v.x, v.z)); if (!cell) continue;
        for (const i of cell) {
          const depth = depthIn(parts[i], v); if (depth <= tol) continue;
          const q = parts[i], c = q.wb.getCenter(new T.Vector3());
          const id = `${a.name} | ${s.part} | ${q.kind.replace('Geometry', '')} ${q.color} @${c.x.toFixed(1)},${c.y.toFixed(1)},${c.z.toFixed(1)}`;
          const h = hits.get(id) || { id, depth: 0, t0: t, t1: t, n: 0, at: t };
          if (depth > h.depth) { h.depth = depth; h.at = t; h.pt = `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`; h.size = `${(q.wb.max.x - q.wb.min.x).toFixed(2)}x${(q.wb.max.y - q.wb.min.y).toFixed(2)}x${(q.wb.max.z - q.wb.min.z).toFixed(2)}`; }
          h.t1 = t; h.n++; hits.set(id, h);
        }
      }
      // Support gap for feet that should be planted.
      if (low.y > 0.05 && low.y < 3.8) {
        const cell = grid.get(key(low.x, low.z)) || []; let floor = -1;
        for (const i of cell) { const q = parts[i]; if (q.wb.min.x <= low.x && q.wb.max.x >= low.x && q.wb.min.z <= low.z && q.wb.max.z >= low.z && q.top <= low.y + 0.05) floor = Math.max(floor, q.top); }
        const gap = low.y - floor;
        if (!a.moving && floor >= 0 && Math.abs(gap) > Math.abs(a.float)) { a.float = gap; a.floatT = t; }
        if (a.moving && floor >= 0) {
          const prev = a.feetLast[low.part];
          const straight = a.name !== 'diver' || ((t % 24) > 9.8 && (t % 24) < 13.8);
          if (straight && gap < 0.05 && prev && prev.f === f - 1) { const sl = Math.hypot(low.x - prev.x, low.z - prev.z) / dt; if (sl > a.slip) { a.slip = sl; a.slipT = t; } }
          a.feetLast[low.part] = { x: low.x, z: low.z, f };
        }
      }
    }
    if (f % 60 === 0) await new Promise(requestAnimationFrame);
  }
  const clips = [...hits.values()].sort((a, b) => b.depth - a.depth);
  return {
    frames, parts: parts.length, samples,
    clipCount: clips.length,
    worst: clips.slice(0, 34).map((h) => `${h.depth.toFixed(3)}m t${h.t0.toFixed(2)}-${h.t1.toFixed(2)} peak ${h.at.toFixed(2)} pt ${h.pt} box ${h.size} ${h.id}`),
    motion: actors.map((a) => ({ a: a.name, speed: +a.maxSpeed.toFixed(1), speedT: +a.maxSpeedT.toFixed(2), turn: +a.maxTurn.toFixed(1), turnT: +a.maxTurnT.toFixed(2), joint: a.maxTurnJoint, slip: +a.slip.toFixed(2), slipT: +a.slipT.toFixed(2), footGap: +a.float.toFixed(3) })),
  };
}
