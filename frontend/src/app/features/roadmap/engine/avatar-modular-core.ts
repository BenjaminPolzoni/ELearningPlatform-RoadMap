import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Geometric core of the modular character (typed port of
 * `src/assets/roadmap/world-3d/avatar-modular-core.js` — identical names and logic for
 * traceability; it only adds types).
 *
 * Extracts face/hair/beard/pants/footwear from the KayKit class GLBs
 * (`Assets/CharacterV2/Characters/gltf/`) and re-binds them (`remapSkinnedMesh`)
 * to the base model's skeleton.
 */

export const faceGeomCache = new Map<string, THREE.BufferGeometry>();
export const hairGeomCache = new Map<string, THREE.BufferGeometry>();
export const beardGeomCache = new Map<string, THREE.BufferGeometry>();
export const legSplitCache = new Map<string, { pantsGeom: THREE.BufferGeometry; shoesGeom: THREE.BufferGeometry }>();

export type LoadCharacterClass = (characterClass: string) => Promise<GLTF | null>;

interface FaceArgs {
  avgX: number;
  avgY: number;
  avgZ: number;
  isSkin: boolean;
  isEye: boolean;
  isFaceFeature: boolean;
  isBandLow: boolean;
  isSide: boolean;
  keepBeard: boolean;
  isBeard: boolean;
}

interface MeshStrategy {
  isFace(a: FaceArgs): boolean;
  isHair(
    avgX: number, avgY: number, avgZ: number,
    isSkin: boolean, isEye: boolean, isFaceFeature: boolean, isBeard: boolean,
  ): boolean;
  postProcessFace?: (faceGeom: THREE.BufferGeometry) => void;
  hairScale: number;
  hairDy: number;
}

const mageFace = (a: FaceArgs): boolean => {
  const isAfterEar =
    Math.abs(a.avgX) >= 0.28 &&
    Math.abs(a.avgX) <= 0.365 &&
    a.avgY >= 1.44 &&
    a.avgY <= 1.65 &&
    a.avgZ >= -0.25 &&
    a.avgZ <= -0.02;
  return a.isSkin || a.isEye || a.isFaceFeature || a.isBandLow || a.isSide || isAfterEar || (a.keepBeard && a.isBeard);
};

function magePostProcess(faceGeom: THREE.BufferGeometry): void {
  const fPos = faceGeom.attributes['position'] as THREE.BufferAttribute;
  const fUv = faceGeom.attributes['uv'] as THREE.BufferAttribute;
  for (let i = 0; i < fPos.count; i++) {
    const u = fUv.getX(i);
    const x = fPos.getX(i);
    const y = fPos.getY(i);
    const z = fPos.getZ(i);
    if (u >= 0.13 && u < 0.25 && Math.abs(x) >= 0.27 && Math.abs(x) <= 0.37 && y >= 1.41 && y <= 1.68 && z >= -0.25 && z <= 0.0) {
      fUv.setXY(i, 0.06, 0.14);
    }
    if (Math.abs(x) <= 0.26 && z < -0.1 && y >= 1.25 && y <= 1.42) {
      const tY = Math.max(0, Math.min(1, (y - 1.25) / (1.385 - 1.25)));
      const tZ = Math.max(0, Math.min(1, (-z - 0.1) / 0.3));
      const factor = tY * tZ;
      fPos.setY(i, y + 0.12 * factor);
      fPos.setZ(i, z - 0.05 * factor);
    }
  }
  fUv.needsUpdate = true;
  fPos.needsUpdate = true;
  faceGeom.computeVertexNormals();
  faceGeom.computeBoundingBox();
  faceGeom.computeBoundingSphere();
}

const humanFace = (a: FaceArgs): boolean =>
  a.isSkin || a.isEye || a.isFaceFeature || a.isBandLow || a.isSide || (a.keepBeard && a.isBeard);

const faceBarbarian = (a: FaceArgs): boolean =>
  a.isEye || a.isFaceFeature || a.isBandLow || a.isSide || (a.keepBeard && a.isBeard) ||
  (a.isSkin && a.avgY < 1.8 && a.avgZ >= 0.2 && Math.abs(a.avgX) <= 0.349);

const hairBarbarian = (
  avgX: number, avgY: number, avgZ: number, isSkin: boolean, isEye: boolean, isFaceFeature: boolean, isBeard: boolean,
): boolean =>
  !isEye && !isFaceFeature && !isBeard &&
  !(isSkin && avgY < 1.8 && avgZ >= 0.2 && Math.abs(avgX) <= 0.349);

export const CharacterMeshStrategies: Record<string, MeshStrategy> = {
  Barbarian: { isFace: faceBarbarian, isHair: hairBarbarian, hairScale: 1.09, hairDy: -0.03 },
  Mage: { isFace: mageFace, isHair: hairBarbarian, postProcessFace: magePostProcess, hairScale: 1.04, hairDy: 0 },
  Rogue: { isFace: mageFace, isHair: hairBarbarian, postProcessFace: magePostProcess, hairScale: 1.04, hairDy: 0 },
  Knight: { isFace: humanFace, isHair: hairBarbarian, hairScale: 1.04, hairDy: 0 },
  Ranger: { isFace: humanFace, isHair: hairBarbarian, hairScale: 1.04, hairDy: 0 },
};

/** Determines whether a mesh name corresponds to a base head or a head accessory. */
export function isHeadMesh(name: string | undefined): boolean {
  if (!name) return false;
  return (
    name.includes('Head') ||
    name.includes('Skull') ||
    name.includes('Jaw') ||
    name.includes('Eyes') ||
    name.includes('Helmet') ||
    name.includes('Visor') ||
    name.includes('BearHat') ||
    name.endsWith('_Hat') ||
    name.endsWith('_Hood') ||
    name.includes('Mask')
  );
}

/** Reassigns the bone weights and indices of a SkinnedMesh so it uses the target skeleton. */
export function remapSkinnedMesh(mesh: THREE.SkinnedMesh, targetSkeleton: THREE.Skeleton): THREE.SkinnedMesh {
  const cloned = mesh.clone();
  cloned.geometry = mesh.geometry.clone();

  const originalBones = mesh.skeleton.bones.map((b) => b.name);
  const targetBoneIndices = originalBones.map((name) =>
    targetSkeleton.bones.findIndex((b) => b.name === name),
  );

  const skinIndices = cloned.geometry.attributes['skinIndex'] as THREE.BufferAttribute;
  const newIndices = skinIndices.clone();
  for (let i = 0; i < skinIndices.count; i++) {
    for (let j = 0; j < 4; j++) {
      const origIdx = skinIndices.getComponent(i, j);
      const mappedIdx = targetBoneIndices[origIdx] ?? -1;
      newIndices.setComponent(i, j, mappedIdx !== -1 ? mappedIdx : 0);
    }
  }
  cloned.geometry.setAttribute('skinIndex', newIndices);
  cloned.bind(targetSkeleton, mesh.bindMatrix);
  return cloned;
}

/** Splits a leg's geometry into pants and footwear according to cutoffY. */
export function splitLegGeometry(
  mesh: THREE.SkinnedMesh, cutoffY = 0.15,
): { pantsGeom: THREE.BufferGeometry; shoesGeom: THREE.BufferGeometry } {
  const cacheKey = mesh.name + '_' + cutoffY;
  const hit = legSplitCache.get(cacheKey);
  if (hit) return hit;

  const geom = mesh.geometry;
  const pos = geom.attributes['position'] as THREE.BufferAttribute;
  const index = geom.index;

  const pantsIndices: number[] = [];
  const shoesIndices: number[] = [];
  const triCount = index ? index.count / 3 : pos.count / 3;

  for (let i = 0; i < triCount; i++) {
    const iA = index ? index.getX(i * 3) : i * 3;
    const iB = index ? index.getX(i * 3 + 1) : i * 3 + 1;
    const iC = index ? index.getX(i * 3 + 2) : i * 3 + 2;
    const avgY = (pos.getY(iA) + pos.getY(iB) + pos.getY(iC)) / 3;
    if (avgY >= cutoffY) pantsIndices.push(iA, iB, iC);
    else shoesIndices.push(iA, iB, iC);
  }

  const pantsGeom = geom.clone();
  pantsGeom.setIndex(pantsIndices);
  const shoesGeom = geom.clone();
  shoesGeom.setIndex(shoesIndices);
  const result = { pantsGeom, shoesGeom };
  legSplitCache.set(cacheKey, result);
  return result;
}

/** Applies a custom tint to the footwear while keeping the light sole. */
export function applyShoesTint(shoesMesh: THREE.SkinnedMesh, colorHex: string): void {
  if (!shoesMesh || !shoesMesh.geometry || !colorHex) return;
  shoesMesh.material = (shoesMesh.material as THREE.Material).clone() as THREE.Material;
  const mat = shoesMesh.material as THREE.MeshStandardMaterial;
  mat.vertexColors = true;
  const geom = shoesMesh.geometry;
  const pos = geom.attributes['position'] as THREE.BufferAttribute;
  const targetColor = new THREE.Color(colorHex);
  const colorAttr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < 0.035) {
      colorAttr[i * 3] = 0.95;
      colorAttr[i * 3 + 1] = 0.95;
      colorAttr[i * 3 + 2] = 0.95;
    } else {
      colorAttr[i * 3] = targetColor.r;
      colorAttr[i * 3 + 1] = targetColor.g;
      colorAttr[i * 3 + 2] = targetColor.b;
    }
  }
  geom.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    prev?.(shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `
      #if defined( USE_COLOR )
        float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        diffuseColor.rgb = vColor.rgb * (lum * 0.7 + 0.4);
      #endif
      `,
    );
  };
}

interface TriAvg {
  iA: number;
  iB: number;
  iC: number;
  avgX: number;
  avgY: number;
  avgZ: number;
  avgU: number;
  avgV: number;
}

function* eachTriangle(mesh: THREE.SkinnedMesh): Generator<TriAvg> {
  const geom = mesh.geometry;
  const pos = geom.attributes['position'] as THREE.BufferAttribute;
  const uv = geom.attributes['uv'] as THREE.BufferAttribute;
  const index = geom.index;
  const triCount = index ? index.count / 3 : pos.count / 3;
  for (let i = 0; i < triCount; i++) {
    const iA = index ? index.getX(i * 3) : i * 3;
    const iB = index ? index.getX(i * 3 + 1) : i * 3 + 1;
    const iC = index ? index.getX(i * 3 + 2) : i * 3 + 2;
    yield {
      iA, iB, iC,
      avgX: (pos.getX(iA) + pos.getX(iB) + pos.getX(iC)) / 3,
      avgY: (pos.getY(iA) + pos.getY(iB) + pos.getY(iC)) / 3,
      avgZ: (pos.getZ(iA) + pos.getZ(iB) + pos.getZ(iC)) / 3,
      avgU: (uv.getX(iA) + uv.getX(iB) + uv.getX(iC)) / 3,
      avgV: (uv.getY(iA) + uv.getY(iB) + uv.getY(iC)) / 3,
    };
  }
}

const isSkinTriangle = (t: TriAvg): boolean => t.avgU < 0.13 && t.avgU >= 0.01 && t.avgV <= 0.25;
const isEyeTriangle = (t: TriAvg): boolean =>
  t.avgU >= 0.25 && t.avgU <= 0.36 && t.avgV <= 0.22 && t.avgY < 1.75 && t.avgZ > 0.25;
const isTrait = (t: TriAvg): boolean =>
  Math.abs(t.avgX) <= 0.349 && t.avgY >= 1.5 && t.avgY <= 1.83 && t.avgZ >= 0.26;

/** Extracts the face geometry for a human head. */
export function extractFaceGeometry(
  sourceHeadMesh: THREE.SkinnedMesh, headClass: string,
  keepBeard = false, withoutBangs = false, stretchesFront = false,
): THREE.BufferGeometry {
  const cacheKey = `${headClass}_${keepBeard}_${withoutBangs}_${stretchesFront}`;
  const hit = faceGeomCache.get(cacheKey);
  if (hit) return hit;

  const faceIndices: number[] = [];
  const strategy = CharacterMeshStrategies[headClass] ?? CharacterMeshStrategies['Knight'];

  for (const t of eachTriangle(sourceHeadMesh)) {
    const isSkin = isSkinTriangle(t);
    const isEye = isEyeTriangle(t);
    const isFaceFeature = isTrait(t);
    let isBeard = false;
    if (headClass === 'Barbarian') isBeard = t.avgY < 1.54 && t.avgZ > 0.0 && !isSkin && !isEye;
    else if (headClass === 'Ranger') isBeard = t.avgY < 1.52 && t.avgZ > 0.1 && !isSkin && !isEye;
    const isBandLow = isSkin && t.avgY < 1.52 && t.avgY >= 1.2;
    const isSide = isSkin && t.avgY < 1.75 && t.avgY >= 1.4 && Math.abs(t.avgX) > 0.3;

    let isFace = strategy.isFace({
      avgX: t.avgX, avgY: t.avgY, avgZ: t.avgZ, isSkin, isEye, isFaceFeature,
      isBandLow, isSide, keepBeard, isBeard,
    });
    if (withoutBangs && isFaceFeature && !isSkin && !isEye &&
      t.avgU >= 0.13 && t.avgU < 0.25 && t.avgV <= 0.25 && !(keepBeard && isBeard)) {
      isFace = false;
    }
    if (isFace) faceIndices.push(t.iA, t.iB, t.iC);
  }

  const faceGeom = sourceHeadMesh.geometry.clone();
  faceGeom.setIndex(faceIndices);

  if (stretchesFront) {
    const fPos = faceGeom.attributes['position'] as THREE.BufferAttribute;
    const fUv = faceGeom.attributes['uv'] as THREE.BufferAttribute;
    for (let i = 0; i < fPos.count; i++) {
      const u = fUv.getX(i);
      const v = fUv.getY(i);
      const y = fPos.getY(i);
      const z = fPos.getZ(i);
      if (u >= 0.01 && u < 0.13 && v <= 0.25 && y >= 1.68 && y <= 1.86 && z >= 0.26) {
        fPos.setY(i, y + 0.035 * ((y - 1.68) / 0.18));
      }
    }
    fPos.needsUpdate = true;
    faceGeom.computeVertexNormals();
    faceGeom.computeBoundingBox();
    faceGeom.computeBoundingSphere();
  }
  strategy.postProcessFace?.(faceGeom);

  faceGeomCache.set(cacheKey, faceGeom);
  return faceGeom;
}

/** Extracts the hair geometry from a donor head. */
export function extractHairGeometry(
  sourceHeadMesh: THREE.SkinnedMesh, hairClass: string, cropsEyebrows = false,
): THREE.BufferGeometry {
  const cacheKey = `${hairClass}_${cropsEyebrows}`;
  const hit = hairGeomCache.get(cacheKey);
  if (hit) return hit;

  const hairIndices: number[] = [];
  for (const t of eachTriangle(sourceHeadMesh)) {
    const isSkin = isSkinTriangle(t);
    const isEye = isEyeTriangle(t);
    const isFaceFeature = isTrait(t);
    let isBeard = false;
    if (hairClass === 'Barbarian') isBeard = t.avgY < 1.54 && t.avgZ > 0.0 && !isSkin && !isEye;
    else if (hairClass === 'Ranger') isBeard = t.avgY < 1.52 && t.avgZ > 0.1 && !isSkin && !isEye;
    const isHairUV = t.avgU >= 0.13 && t.avgU < 0.25 && t.avgV <= 0.25;
    let isHair = !isSkin && !isEye && (!isFaceFeature || isHairUV) && !isBeard;
    if (cropsEyebrows && hairClass !== 'Barbarian' && isHairUV &&
      Math.abs(t.avgX) <= 0.24 && t.avgY >= 1.68 && t.avgY <= 1.83 && t.avgZ >= 0.33) {
      isHair = false;
    }
    if (hairClass === 'Barbarian') {
      isHair = CharacterMeshStrategies['Barbarian'].isHair(
        t.avgX, t.avgY, t.avgZ, isSkin, isEye, isFaceFeature, isBeard,
      );
    }
    if (isHair) hairIndices.push(t.iA, t.iB, t.iC);
  }

  const hairGeom = sourceHeadMesh.geometry.clone();
  hairGeom.setIndex(hairIndices);
  hairGeomCache.set(cacheKey, hairGeom);
  return hairGeom;
}

/** Extracts the beard geometry (Barbarian or Archer). */
export function extractBeardGeometry(sourceHeadMesh: THREE.SkinnedMesh, beardType: string): THREE.BufferGeometry {
  const hit = beardGeomCache.get(beardType);
  if (hit) return hit;

  const beardIndices: number[] = [];
  for (const t of eachTriangle(sourceHeadMesh)) {
    const isSkin = isSkinTriangle(t);
    const isEye = isEyeTriangle(t);
    let isBeard = false;
    if (beardType === 'long') isBeard = t.avgY < 1.54 && t.avgZ > 0.0 && !isSkin && !isEye;
    else if (beardType === 'short') isBeard = t.avgY < 1.52 && t.avgZ > 0.1 && !isSkin && !isEye;
    if (isBeard) beardIndices.push(t.iA, t.iB, t.iC);
  }

  const beardGeom = sourceHeadMesh.geometry.clone();
  beardGeom.setIndex(beardIndices);
  beardGeomCache.set(beardType, beardGeom);
  return beardGeom;
}

function tints(material: THREE.Material, colorHex: string): void {
  const mat = material as THREE.MeshStandardMaterial;
  mat.color.set(colorHex);
  if (colorHex.toLowerCase() !== '#ffffff' && mat.emissive) {
    mat.emissive.set(colorHex);
    mat.emissiveIntensity = 0.35;
  }
}

/** Mounts the modular hair on the character. */
export async function mountHair(
  getGLTF: LoadCharacterClass, targetRig: THREE.Object3D, targetSkin: THREE.SkinnedMesh,
  hairType: string, headClass: string, faceWithoutBangs: boolean, hairColor: string,
): Promise<void> {
  if (!hairType || hairType === 'default') return;
  const hairClassMap: Record<string, string> = {
    mage: 'Mage', ranger: 'Ranger', knight: 'Knight', rogue: 'Rogue', none: 'Barbarian', barbarian: 'Barbarian',
  };
  const srcClass = hairClassMap[hairType];
  if (!srcClass) return;

  const srcGltf = await getGLTF(srcClass);
  const origHead = srcGltf?.scene.getObjectByName(`${srcClass}_Head`) as THREE.SkinnedMesh | undefined;
  if (!srcGltf || !origHead) return;

  const isForeign = srcClass !== 'Barbarian' && srcClass !== headClass;
  const hairGeom = extractHairGeometry(origHead, srcClass, false);
  const hMesh = origHead.clone();
  hMesh.geometry = isForeign ? hairGeom.clone() : hairGeom;

  if (isForeign) {
    const strategy = CharacterMeshStrategies[headClass] ?? CharacterMeshStrategies['Knight'];
    const sHair = strategy.hairScale;
    const dyHair = strategy.hairDy;
    const pPos = hMesh.geometry.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < pPos.count; i++) {
      pPos.setXYZ(
        i,
        pPos.getX(i) * sHair,
        dyHair + 1.68 + (pPos.getY(i) - 1.68) * sHair,
        0.04 + (pPos.getZ(i) - 0.04) * sHair,
      );
    }
    pPos.needsUpdate = true;
    hMesh.geometry.computeVertexNormals();
    hMesh.geometry.computeBoundingBox();
    hMesh.geometry.computeBoundingSphere();
  }

  if (srcClass === 'Barbarian') {
    hMesh.material = (targetSkin.material as THREE.Material).clone();
  } else {
    hMesh.material = (origHead.material as THREE.Material).clone();
    if (hairColor) tints(hMesh.material, hairColor);
  }
  const mat = hMesh.material as THREE.MeshStandardMaterial;
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -1.0;
  mat.polygonOffsetUnits = -1.0;

  // ponytail: the faceWithoutBangs parameter does not currently alter the crop (cropsEyebrows=false
  // as in the original); the signature is kept for parity with avatar-modular-core.js.
  void faceWithoutBangs;
  const remappedHair = remapSkinnedMesh(hMesh, targetSkin.skeleton);
  remappedHair.name = 'modular_hair';
  targetRig.add(remappedHair);
}

/** Mounts the modular beard on the character. */
export async function mountBeard(
  getGLTF: LoadCharacterClass, targetRig: THREE.Object3D, targetSkin: THREE.SkinnedMesh,
  beardType: string, beardColor: string,
): Promise<void> {
  if (!beardType || beardType === 'none') return;
  const srcClass = beardType === 'long' ? 'Barbarian' : 'Ranger';
  const srcGltf = await getGLTF(srcClass);
  const origHead = srcGltf?.scene.getObjectByName(`${srcClass}_Head`) as THREE.SkinnedMesh | undefined;
  if (!srcGltf || !origHead) return;

  const bMesh = origHead.clone();
  bMesh.geometry = extractBeardGeometry(origHead, beardType);
  bMesh.material = (origHead.material as THREE.Material).clone();
  if (beardColor) tints(bMesh.material, beardColor);
  const mat = bMesh.material as THREE.MeshStandardMaterial;
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -1.0;
  mat.polygonOffsetUnits = -1.0;

  const remappedBeard = remapSkinnedMesh(bMesh, targetSkin.skeleton);
  remappedBeard.name = 'modular_beard';
  targetRig.add(remappedBeard);
}

/** Mounts the Hooded character's face covering as a universal cosmetic. */
export async function mountMask(
  getGLTF: LoadCharacterClass, targetRig: THREE.Object3D, targetSkin: THREE.SkinnedMesh, maskColor: string,
): Promise<void> {
  const srcGltf = await getGLTF('Rogue_Hooded');
  const origMask = srcGltf?.scene.getObjectByName('RogueHooded_Mask') as THREE.SkinnedMesh | undefined;
  if (!srcGltf || !origMask) return;
  const mMesh = origMask.clone();
  mMesh.material = (origMask.material as THREE.Material).clone();
  if (maskColor) {
    try {
      tints(mMesh.material, maskColor);
    } catch {
      /* ignore if invalid color */
    }
  }
  const mat = mMesh.material as THREE.MeshStandardMaterial;
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -1.0;
  mat.polygonOffsetUnits = -1.0;
  const remappedMask = remapSkinnedMesh(mMesh, targetSkin.skeleton);
  remappedMask.name = 'modular_beard';
  targetRig.add(remappedMask);
}

/** Factory: mounting functions bound to the environment's GLTF loader. */
export function createAvatarMounter(getGLTF: LoadCharacterClass): {
  mountHair(
    targetRig: THREE.Object3D, targetSkin: THREE.SkinnedMesh,
    hairType: string, headClass: string, faceWithoutBangs: boolean, hairColor: string,
  ): Promise<void>;
  mountBeard(
    targetRig: THREE.Object3D, targetSkin: THREE.SkinnedMesh, beardType: string, beardColor: string,
  ): Promise<void>;
  mountMask(
    targetRig: THREE.Object3D, targetSkin: THREE.SkinnedMesh, maskColor: string,
  ): Promise<void>;
} {
  return {
    mountHair: (targetRig, targetSkin, hairType, headClass, faceWithoutBangs, hairColor) =>
      mountHair(getGLTF, targetRig, targetSkin, hairType, headClass, faceWithoutBangs, hairColor),
    mountBeard: (targetRig, targetSkin, beardType, beardColor) =>
      mountBeard(getGLTF, targetRig, targetSkin, beardType, beardColor),
    mountMask: (targetRig, targetSkin, maskColor) =>
      mountMask(getGLTF, targetRig, targetSkin, maskColor),
  };
}
