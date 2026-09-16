import * as THREE from 'three';

/** Transient effects own their resources; completion badges derive only from saved progress. */
export function createProgressCelebration(scene, readScene) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const seen = new Set();
  let pending = null;
  let active = null;
  let badges = new THREE.Group();
  badges.name = 'completed-unit-badges';
  let revision = -1;
  scene.add(badges);

  function release(group) {
    group.removeFromParent();
    group.traverse(node => {
      if (node.isMesh || node.isPoints) node.geometry.dispose();
      node.material?.map?.dispose();
      node.material?.dispose();
    });
  }

  function label(text, width = 3) {
    const canvas = document.createElement('canvas');
    canvas.width = 384; canvas.height = 112;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#151a24ee';
    ctx.beginPath(); ctx.roundRect(4, 4, 376, 104, 24); ctx.fill();
    ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#fff0a6'; ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 192, 57);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false,
    }));
    sprite.scale.set(width, width * 112 / 384, 1);
    return sprite;
  }

  function receive(event) {
    if (event.origin !== location.origin || event.source !== window.parent) return;
    const data = event.data;
    if (!data || data.type !== 'celebrateProgress' || typeof data.id !== 'string' || !data.id ||
        typeof data.unitId !== 'string' || typeof data.activityId !== 'string' ||
        !Number.isFinite(data.xp) || data.xp < 0 || typeof data.unitCompleted !== 'boolean' ||
        typeof data.unitName !== 'string' || seen.has(data.id)) return;
    seen.add(data.id);
    // Bound session bookkeeping even during unusually long play sessions.
    if (seen.size > 256) seen.delete(seen.values().next().value);
    pending = { ...data, deadline: performance.now() + 2900 };
  }

  function start(data, state, target, now) {
    if (active) release(active.group);
    const group = new THREE.Group();
    group.name = 'progress-celebration';
    const text = label(data.xp > 0 ? `+${data.xp} XP` : '✓ Completado', .9);
    text.material.depthTest = false;
    text.renderOrder = 10;
    text.position.copy(state.player.position); text.position.y += .95;
    group.add(text);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.2, 48),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(target.x, .09, target.z);
    group.add(ring);
    let particles = null;
    const velocities = [];
    if (!reducedMotion.matches) {
      const points = new Float32Array(24 * 3);
      for (let i = 0; i < 24; i++) {
        const angle = i / 24 * Math.PI * 2;
        velocities.push([Math.cos(angle) * (1 + i % 3 * .2), 1.6 + i % 4 * .25, Math.sin(angle) * (1 + i % 3 * .2)]);
      }
      particles = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(points, 3)),
        new THREE.PointsMaterial({ color: 0xffdf70, size: .09, transparent: true, depthWrite: false }));
      particles.position.copy(state.player.position); particles.position.y += 1;
      group.add(particles);
    }
    scene.add(group);
    active = { group, text, ring, particles, velocities, started: now, textY: text.position.y, zone: state.zone };
    window.parent.postMessage({ type: 'celebrationStarted', id: data.id }, location.origin);
  }

  function update(now) {
    const state = readScene();
    badges.visible = state.ready && state.zone === 'city' && !state.busy;
    if (state.ready && revision !== state.revision) {
      release(badges); badges = new THREE.Group(); scene.add(badges);
      badges.name = 'completed-unit-badges';
      badges.visible = state.zone === 'city' && !state.busy;
      revision = state.revision;
      for (const unit of state.units.filter(u => u.resuelta)) {
        const entry = state.modules.find(m => m.type === 'biome' && m.unitId === unit.unitId);
        if (!entry) continue;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#19212a'; ctx.strokeStyle = '#facc15'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(64, 64, 56, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#facc15'; ctx.font = 'bold 76px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✓', 64, 67);
        const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthWrite: false }));
        badge.scale.set(.65, .65, 1);
        badge.name = unit.unitId;
        badge.position.set(entry.x, 3.5, entry.z);
        badges.add(badge);
      }
    }
    if (pending) {
      if (now > pending.deadline) pending = null;
      else if (state.ready && !state.busy) {
        const unit = state.units.find(u => u.unitId === pending.unitId);
        const completed = unit?.actividades.some(a => a.id === pending.activityId && a.completada);
        const target = state.modules.find(m => m.type === 'challenge' && m.unitId === pending.unitId && m.actividadId === pending.activityId);
        // Waiting for the completed node also guards against the old scene being ready before setUnidades arrives.
        if (completed && target && state.zone === pending.unitId) { start(pending, state, target, now); pending = null; }
      }
    }
    if (!active) return;
    const elapsed = (now - active.started) / 1000;
    if (elapsed >= 1.2 || !state.ready || state.zone !== active.zone || state.busy) {
      release(active.group); active = null; return;
    }
    if (reducedMotion.matches) {
      if (active.particles) active.particles.visible = false;
      return;
    }
    active.text.position.y = active.textY + elapsed * .15;
    active.text.material.opacity = Math.min(1, (1.2 - elapsed) * 3);
    active.ring.scale.setScalar(1 + elapsed * .4);
    active.ring.material.opacity = Math.max(0, 1 - elapsed);
    if (active.particles) {
      const positions = active.particles.geometry.attributes.position;
      active.velocities.forEach(([x, y, z], i) => positions.setXYZ(i, x * elapsed, y * elapsed - 1.8 * elapsed * elapsed, z * elapsed));
      positions.needsUpdate = true;
      active.particles.material.opacity = Math.max(0, 1 - elapsed);
    }
  }

  function dispose() {
    if (active) release(active.group);
    release(badges); pending = null; seen.clear();
    window.removeEventListener('message', receive);
    window.removeEventListener('pagehide', dispose);
  }
  window.addEventListener('message', receive);
  window.addEventListener('pagehide', dispose);
  return { update, dispose };
}
