import * as THREE from 'three';

export const APPROVED_AVATAR_URL = 'Assets/Avatar/avatar-low-poly-approved.glb';

export const AVATAR_SLOT_NAMES = Object.freeze([
  'Body',
  'Hair',
  'Top',
  'Bottom',
  'Shoes',
  'HeadAccessory',
  'FaceAccessory',
  'HandAccessory',
  'BackAccessory',
  'WaistAccessory',
  'ShoulderAccessory',
]);

const SLOT_BINDINGS = Object.freeze({
  Body: { configKey: 'gender', required: true },
  Hair: { configKey: 'hairStyle', required: true },
  Top: { configKey: 'topStyle', required: true },
  Bottom: { configKey: 'bottomStyle', required: true },
  Shoes: { configKey: 'shoeStyle', required: true },
  HeadAccessory: { configKey: 'headAccessory' },
  FaceAccessory: { configKey: 'faceAccessory' },
  HandAccessory: { configKey: 'handItem' },
  BackAccessory: { configKey: 'backItem' },
  WaistAccessory: { configKey: 'waistItem' },
  ShoulderAccessory: { configKey: 'shoulderItem' },
});

const OPTIONAL_SLOT_BINDINGS = Object.freeze({
  Details: { configKey: 'detailItem' },
});

const DEFAULT_CONFIG = Object.freeze({
  gender: 'male',
  hairStyle: 'a',
  topStyle: 'tshirt',
  bottomStyle: 'jogger',
  shoeStyle: 'sneakers',
  skinColor: '#f8d4aa',
  hairColor: '#4a2c11',
  shirtColor: '#1e40af',
  pantsColor: '#34353b',
  shoesColor: '#f1f1ef',
  headAccessory: 'none',
  faceAccessory: 'none',
  handItem: 'none',
  backItem: 'none',
  waistItem: 'none',
  shoulderItem: 'none',
  detailItem: 'none',
});

export class AvatarAssetError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'AvatarAssetError';
    this.details = details;
  }
}

export function isGLBBuffer(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 20) return false;
  const magic = new Uint8Array(buffer, 0, 4);
  return magic[0] === 0x67 && magic[1] === 0x6c && magic[2] === 0x54 && magic[3] === 0x46;
}

export function normalizeAvatarConfig(input = {}) {
  const normalized = { ...DEFAULT_CONFIG, ...input };

  // Compatibility with the previous configuration while localStorage is migrated.
  if (!input.hairStyle && input.variant) normalized.hairStyle = input.variant;
  if (!input.faceAccessory && ['glasses', 'visor'].includes(input.headAccessory)) {
    normalized.faceAccessory = input.headAccessory;
    normalized.headAccessory = 'none';
  }
  if (!input.faceAccessory && input.accessory?.includes('glasses')) {
    normalized.faceAccessory = 'glasses';
  }

  return normalized;
}

function normalizeName(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function findVariant(slot, requestedValue) {
  const requested = normalizeName(requestedValue);
  if (!requested || requested === 'none') return null;

  return slot.children.find((child) => {
    const explicitVariant = normalizeName(child.userData?.variant);
    const nodeName = normalizeName(child.name);
    return explicitVariant === requested || nodeName === requested || nodeName.endsWith(requested);
  }) ?? null;
}

function setSlotVariant(slot, requestedValue, required) {
  const selected = findVariant(slot, requestedValue);
  slot.children.forEach((child) => {
    child.visible = child === selected;
  });

  if (selected || !required) return selected;

  const fallback = slot.children[0] ?? null;
  if (fallback) fallback.visible = true;
  return fallback;
}

function prepareMeshes(root) {
  const preparedMaterials = new Set();
  root.traverse((object) => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.filter(Boolean).forEach((material) => {
      if (preparedMaterials.has(material.uuid)) return;
      preparedMaterials.add(material.uuid);
      material.flatShading = true;
      material.vertexColors = true;
      material.transparent = false;
      material.opacity = 1;
      material.color?.set(0xffffff);
      material.needsUpdate = true;
    });

    const position = object.geometry?.attributes?.position;
    if (position && !object.geometry.attributes.color) {
      const colors = new Float32Array(position.count * 3);
      colors.fill(1);
      object.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    object.castShadow = true;
    object.receiveShadow = false;
  });
}

function inferColorSlot(mesh, material) {
  const explicit = mesh.userData?.colorSlot ?? material.userData?.colorSlot;
  if (explicit) return normalizeName(explicit);

  const searchableName = normalizeName(`${mesh.name} ${material.name}`);
  if (searchableName.includes('skin')) return 'skin';
  if (searchableName.includes('hair')) return 'hair';
  if (searchableName.includes('top') || searchableName.includes('shirt')) return 'top';
  if (searchableName.includes('bottom') || searchableName.includes('pants')) return 'bottom';
  if (searchableName.includes('shoe')) return 'shoes';
  return null;
}

function applyColors(root, config) {
  const colors = {
    skin: config.skinColor,
    hair: config.hairColor,
    top: config.shirtColor,
    bottom: config.pantsColor,
    shoes: config.shoesColor,
  };

  root.traverse((object) => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const colorSlot = materials.map((material) => inferColorSlot(object, material)).find(Boolean);
    const color = new THREE.Color(colorSlot && colors[colorSlot] ? colors[colorSlot] : 0xffffff);
    const attribute = object.geometry?.attributes?.color;
    if (!attribute) return;
    for (let i = 0; i < attribute.count; i++) attribute.setXYZ(i, color.r, color.g, color.b);
    attribute.needsUpdate = true;
  });
}

function isVisibleInHierarchy(object, root) {
  let current = object;
  while (current) {
    if (!current.visible) return false;
    if (current === root) return true;
    current = current.parent;
  }
  return false;
}

function collectStats(root, visibleOnly = false) {
  let triangles = 0;
  const materials = new Set();
  const skeletons = new Set();

  root.traverse((object) => {
    if (!object.isMesh) return;
    if (visibleOnly && !isVisibleInHierarchy(object, root)) return;
    const geometry = object.geometry;
    if (geometry?.index) triangles += geometry.index.count / 3;
    else if (geometry?.attributes?.position) triangles += geometry.attributes.position.count / 3;

    const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
    meshMaterials.filter(Boolean).forEach((material) => materials.add(material.uuid));
    if (object.isSkinnedMesh && object.skeleton) {
      // Two SkinnedMesh can have different Skeleton instances and still share
      // exactly the same rig. The bone signature avoids reporting that case as an error.
      skeletons.add(object.skeleton.bones.map((bone) => bone.uuid).join('|'));
    }
  });

  return { triangles: Math.round(triangles), materials: materials.size, skeletons: skeletons.size };
}

function findAvatarRoot(scene) {
  if (scene.name === 'Avatar') return scene;
  return scene.getObjectByName('Avatar');
}

function validateAsset(scene) {
  const errors = [];
  const warnings = [];
  const root = findAvatarRoot(scene);

  if (!root) {
    throw new AvatarAssetError('El GLB no contiene un nodo raíz llamado "Avatar".');
  }

  const slots = {};
  AVATAR_SLOT_NAMES.forEach((slotName) => {
    const slot = root.getObjectByName(slotName);
    if (!slot) errors.push(`Falta el slot ${slotName}.`);
    else {
      slots[slotName] = slot;
      if (SLOT_BINDINGS[slotName].required && slot.children.length === 0) {
        errors.push(`El slot ${slotName} no contiene variantes.`);
      }
    }
  });

  Object.keys(OPTIONAL_SLOT_BINDINGS).forEach((slotName) => {
    const slot = root.getObjectByName(slotName);
    if (slot) slots[slotName] = slot;
  });

  if (errors.length) {
    throw new AvatarAssetError('El GLB no cumple el contrato modular del avatar.', errors);
  }

  const totalStats = collectStats(root);
  if (totalStats.skeletons > 1) warnings.push(`Se detectaron ${totalStats.skeletons} esqueletos; todas las variantes deben compartir uno.`);

  return { root, slots, totalStats, warnings };
}

function parseGLB(loader, buffer, resourcePath) {
  return new Promise((resolve, reject) => {
    loader.parse(buffer.slice(0), resourcePath, resolve, reject);
  });
}

function disposeObject(root) {
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.geometry?.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.filter(Boolean).forEach((material) => material.dispose());
  });
}

export async function createModularAvatar(loader, buffer, config = {}, resourcePath = 'Assets/Avatar/') {
  if (!isGLBBuffer(buffer)) {
    throw new AvatarAssetError('El recurso recibido no es un archivo GLB válido.');
  }
  const gltf = await parseGLB(loader, buffer, resourcePath);
  const { root, slots, totalStats, warnings } = validateAsset(gltf.scene);
  const normalizedConfig = normalizeAvatarConfig(config);

  prepareMeshes(root);

  const mixer = new THREE.AnimationMixer(root);
  const actions = new Map();
  (gltf.animations ?? []).forEach((clip) => actions.set(clip.name.toLowerCase(), mixer.clipAction(clip)));
  let activeAction = null;

  const controller = {
    model: root,
    stats: null,
    totalStats,
    warnings,
    applyConfig(nextConfig) {
      const next = normalizeAvatarConfig(nextConfig);
      Object.entries(SLOT_BINDINGS).forEach(([slotName, binding]) => {
        setSlotVariant(slots[slotName], next[binding.configKey], binding.required);
      });
      Object.entries(OPTIONAL_SLOT_BINDINGS).forEach(([slotName, binding]) => {
        if (slots[slotName]) setSlotVariant(slots[slotName], next[binding.configKey], false);
      });
      applyColors(root, next);
      this.stats = collectStats(root, true);
      if (this.stats.triangles > 10000) {
        const warning = `El avatar equipado tiene ${this.stats.triangles} triángulos; el máximo objetivo es 10.000.`;
        if (!warnings.includes(warning)) warnings.push(warning);
      }
      if (this.stats.materials > 2) {
        const warning = `El avatar equipado usa ${this.stats.materials} materiales; el objetivo es 1–2.`;
        if (!warnings.includes(warning)) warnings.push(warning);
      }
    },
    play(name) {
      const requested = actions.get(String(name).toLowerCase()) ?? actions.get('idle') ?? actions.values().next().value;
      if (!requested || requested === activeAction) return;
      activeAction?.fadeOut(0.15);
      requested.reset().fadeIn(0.15).play();
      activeAction = requested;
    },
    update(delta) {
      mixer.update(delta);
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
      disposeObject(root);
    },
  };

  controller.applyConfig(normalizedConfig);
  controller.play('idle');
  return controller;
}
