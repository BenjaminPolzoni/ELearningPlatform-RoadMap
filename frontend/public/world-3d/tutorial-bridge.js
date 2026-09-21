import * as THREE from 'three';

/** The scene reports facts; Angular owns tutorial progress and browser persistence. */
export function createTutorialBridge(scene, readScene) {
  let command = { visible: false, paused: false, step: 1, attempt: 0 };
  let distance = 0;
  let reportedMovement = false;
  let signature = '';
  let marker = null;
  let markerKey = '';
  let latest = null;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const controls = document.getElementById('controls-banner');
  const send = data => window.parent.postMessage(data, window.location.origin);

  function clearMarker() {
    if (!marker) return;
    scene.remove(marker);
    marker.traverse(node => {
      // Sprite geometry is shared by Three.js; only our ring owns its geometry.
      if (node.isMesh) node.geometry.dispose();
      if (node.material) {
        node.material.map?.dispose();
        node.material.dispose();
      }
    });
    marker = null;
    markerKey = '';
  }

  function placeMarker(target, label) {
    const key = `${target.type}:${target.unitId}:${target.activityId}:${target.x}:${target.z}`;
    if (key === markerKey) return;
    clearMarker();
    markerKey = key;
    marker = new THREE.Group();
    const radius = target.type === 'biome' ? 1.8 : 1.05;
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius, radius + .07, 48),
      new THREE.MeshBasicMaterial({ color: 0x7ffaff, transparent: true, opacity: .7, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = .06;
    marker.add(ring);
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#121620ed'; ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = '#7ffaff'; ctx.strokeRect(1, 1, 254, 62);
    ctx.font = '600 24px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c5ffff'; ctx.fillText(label, 128, 32);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: true, depthWrite: false }));
    tag.scale.set(1.45, .36, 1);
    tag.position.y = target.type === 'biome' ? 2.85 : 2.3;
    marker.add(tag);
    marker.position.set(target.x, 0, target.z);
    scene.add(marker);
  }

  function receive(event) {
    if (event.source !== window.parent || event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || data.type !== 'tutorialControl' || typeof data.visible !== 'boolean' ||
        typeof data.paused !== 'boolean' || ![1, 2, 3].includes(data.step) ||
        !Number.isInteger(data.attempt) ||
        !(data.unitId === null || typeof data.unitId === 'string') ||
        !(data.activityId === null || typeof data.activityId === 'string')) return;
    if (data.attempt !== command.attempt) { distance = 0; reportedMovement = false; }
    command = data;
    if (data.paused) window.dispatchEvent(new Event('blur'));
  }
  window.addEventListener('message', receive);

  function update(now) {
    const state = readScene();
    latest = state;
    // No positions/frame traffic: snapshots only when readiness, zone or UI changes.
    const next = `${state.ready}:${state.busy}:${state.zone}:${state.revision}`;
    if (next !== signature) {
      signature = next;
      send({ type: 'tutorialScene', ready: state.ready, busy: state.busy, zone: state.zone,
        destinations: state.ready ? state.destinations() : [] });
    }
    const visible = command.visible && state.ready && !state.busy && !command.paused;
    controls.style.visibility = visible ? 'hidden' : '';
    if (!visible || command.step === 1) { clearMarker(); return; }
    const returning = state.zone !== 'city' && state.zone !== command.unitId;
    const target = state.modules.find(m => returning
      ? m.type === 'returnCity' && m.unitId === state.zone
      : state.zone === 'city' ? m.type === 'biome' && m.unitId === command.unitId
      : m.type === 'challenge' && !m.locked && m.unitId === command.unitId && m.activityId === command.activityId);
    if (!target) { clearMarker(); return; }
    placeMarker(target, returning ? 'Volvé a la ciudad' : command.step === 2 ? 'Tu próxima parada' : 'Probá por acá');
    marker.children[0].material.opacity = motion.matches ? .7 : .65 + Math.sin(now * .002) * .12;
  }

  function moved(actualDistance) {
    if (!command.visible || command.paused || command.step !== 1 || reportedMovement ||
        !latest?.ready || latest.busy || !Number.isFinite(actualDistance)) return;
    distance += Math.max(0, actualDistance);
    if (distance >= 1.5) {
      reportedMovement = true;
      send({ type: 'tutorialMoved', attempt: command.attempt });
    }
  }
  function dispose() {
    clearMarker();
    window.removeEventListener('message', receive);
    window.removeEventListener('pagehide', dispose);
    controls.style.visibility = '';
  }
  window.addEventListener('pagehide', dispose);
  return { update, moved, dispose, get paused() { return command.paused; } };
}
