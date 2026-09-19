import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Núcleo geométrico del personaje modular (port tipado de
 * `public/mundo-3d/avatar-modular-core.js` — nombres y lógica idénticos para
 * trazabilidad; solo agrega tipos).
 *
 * Extrae cara/pelo/barba/pantalón/calzado de los GLB de clases KayKit
 * (`Assets/CharacterV2/Characters/gltf/`) y los re-enlaza (`remapSkinnedMesh`)
 * al esqueleto del modelo base.
 */

export const faceGeomCache = new Map<string, THREE.BufferGeometry>();
export const hairGeomCache = new Map<string, THREE.BufferGeometry>();
export const beardGeomCache = new Map<string, THREE.BufferGeometry>();
export const legSplitCache = new Map<string, { pantsGeom: THREE.BufferGeometry; shoesGeom: THREE.BufferGeometry }>();

export type CargarClase = (clase: string) => Promise<GLTF | null>;

interface FaceArgs {
  avgX: number;
  avgY: number;
  avgZ: number;
  isSkin: boolean;
  isEye: boolean;
  isFaceFeature: boolean;
  isBandaBaja: boolean;
  isLado: boolean;
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
  const isTrasOreja =
    Math.abs(a.avgX) >= 0.28 &&
    Math.abs(a.avgX) <= 0.365 &&
    a.avgY >= 1.44 &&
    a.avgY <= 1.65 &&
    a.avgZ >= -0.25 &&
    a.avgZ <= -0.02;
  return a.isSkin || a.isEye || a.isFaceFeature || a.isBandaBaja || a.isLado || isTrasOreja || (a.keepBeard && a.isBeard);
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

const caraHumana = (a: FaceArgs): boolean =>
  a.isSkin || a.isEye || a.isFaceFeature || a.isBandaBaja || a.isLado || (a.keepBeard && a.isBeard);

const caraBarbaro = (a: FaceArgs): boolean =>
  a.isEye || a.isFaceFeature || a.isBandaBaja || a.isLado || (a.keepBeard && a.isBeard) ||
  (a.isSkin && a.avgY < 1.8 && a.avgZ >= 0.2 && Math.abs(a.avgX) <= 0.349);

const peloBarbaro = (
  avgX: number, avgY: number, avgZ: number, isSkin: boolean, isEye: boolean, isFaceFeature: boolean, isBeard: boolean,
): boolean =>
  !isEye && !isFaceFeature && !isBeard &&
  !(isSkin && avgY < 1.8 && avgZ >= 0.2 && Math.abs(avgX) <= 0.349);

export const CharacterMeshStrategies: Record<string, MeshStrategy> = {
  Barbarian: { isFace: caraBarbaro, isHair: peloBarbaro, hairScale: 1.09, hairDy: -0.03 },
  Mage: { isFace: mageFace, isHair: peloBarbaro, postProcessFace: magePostProcess, hairScale: 1.04, hairDy: 0 },
  Rogue: { isFace: mageFace, isHair: peloBarbaro, postProcessFace: magePostProcess, hairScale: 1.04, hairDy: 0 },
  Knight: { isFace: caraHumana, isHair: peloBarbaro, hairScale: 1.04, hairDy: 0 },
  Ranger: { isFace: caraHumana, isHair: peloBarbaro, hairScale: 1.04, hairDy: 0 },
};

/** Determina si el nombre de una malla corresponde a una cabeza base o accesorio de cabeza. */
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

/** Reasigna los pesos e índices óseos de un SkinnedMesh para que use el esqueleto de destino. */
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

/** Separa la geometría de una pierna en pantalón y calzado según cutoffY. */
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

/** Aplica tinte personalizado al calzado manteniendo la suela clara. */
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

function* cadaTriangulo(mesh: THREE.SkinnedMesh): Generator<TriAvg> {
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

const esPiel = (t: TriAvg): boolean => t.avgU < 0.13 && t.avgU >= 0.01 && t.avgV <= 0.25;
const esOjo = (t: TriAvg): boolean =>
  t.avgU >= 0.25 && t.avgU <= 0.36 && t.avgV <= 0.22 && t.avgY < 1.75 && t.avgZ > 0.25;
const esRasgo = (t: TriAvg): boolean =>
  Math.abs(t.avgX) <= 0.349 && t.avgY >= 1.5 && t.avgY <= 1.83 && t.avgZ >= 0.26;

/** Extrae la geometría de la cara para un cabezal humano. */
export function extractFaceGeometry(
  sourceHeadMesh: THREE.SkinnedMesh, headClass: string,
  keepBeard = false, sinFlequillo = false, estiraFrente = false,
): THREE.BufferGeometry {
  const cacheKey = `${headClass}_${keepBeard}_${sinFlequillo}_${estiraFrente}`;
  const hit = faceGeomCache.get(cacheKey);
  if (hit) return hit;

  const faceIndices: number[] = [];
  const strategy = CharacterMeshStrategies[headClass] ?? CharacterMeshStrategies['Knight'];

  for (const t of cadaTriangulo(sourceHeadMesh)) {
    const isSkin = esPiel(t);
    const isEye = esOjo(t);
    const isFaceFeature = esRasgo(t);
    let isBeard = false;
    if (headClass === 'Barbarian') isBeard = t.avgY < 1.54 && t.avgZ > 0.0 && !isSkin && !isEye;
    else if (headClass === 'Ranger') isBeard = t.avgY < 1.52 && t.avgZ > 0.1 && !isSkin && !isEye;
    const isBandaBaja = isSkin && t.avgY < 1.52 && t.avgY >= 1.2;
    const isLado = isSkin && t.avgY < 1.75 && t.avgY >= 1.4 && Math.abs(t.avgX) > 0.3;

    let isFace = strategy.isFace({
      avgX: t.avgX, avgY: t.avgY, avgZ: t.avgZ, isSkin, isEye, isFaceFeature,
      isBandaBaja, isLado, keepBeard, isBeard,
    });
    if (sinFlequillo && isFaceFeature && !isSkin && !isEye &&
      t.avgU >= 0.13 && t.avgU < 0.25 && t.avgV <= 0.25 && !(keepBeard && isBeard)) {
      isFace = false;
    }
    if (isFace) faceIndices.push(t.iA, t.iB, t.iC);
  }

  const faceGeom = sourceHeadMesh.geometry.clone();
  faceGeom.setIndex(faceIndices);

  if (estiraFrente) {
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

/** Extrae la geometría del cabello de un cabezal donante. */
export function extractHairGeometry(
  sourceHeadMesh: THREE.SkinnedMesh, hairClass: string, recortaCejas = false,
): THREE.BufferGeometry {
  const cacheKey = `${hairClass}_${recortaCejas}`;
  const hit = hairGeomCache.get(cacheKey);
  if (hit) return hit;

  const hairIndices: number[] = [];
  for (const t of cadaTriangulo(sourceHeadMesh)) {
    const isSkin = esPiel(t);
    const isEye = esOjo(t);
    const isFaceFeature = esRasgo(t);
    let isBeard = false;
    if (hairClass === 'Barbarian') isBeard = t.avgY < 1.54 && t.avgZ > 0.0 && !isSkin && !isEye;
    else if (hairClass === 'Ranger') isBeard = t.avgY < 1.52 && t.avgZ > 0.1 && !isSkin && !isEye;
    const isHairUV = t.avgU >= 0.13 && t.avgU < 0.25 && t.avgV <= 0.25;
    let isHair = !isSkin && !isEye && (!isFaceFeature || isHairUV) && !isBeard;
    if (recortaCejas && hairClass !== 'Barbarian' && isHairUV &&
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

/** Extrae la geometría de la barba (Bárbaro o Arquero). */
export function extractBeardGeometry(sourceHeadMesh: THREE.SkinnedMesh, beardType: string): THREE.BufferGeometry {
  const hit = beardGeomCache.get(beardType);
  if (hit) return hit;

  const beardIndices: number[] = [];
  for (const t of cadaTriangulo(sourceHeadMesh)) {
    const isSkin = esPiel(t);
    const isEye = esOjo(t);
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

function tiñe(material: THREE.Material, colorHex: string): void {
  const mat = material as THREE.MeshStandardMaterial;
  mat.color.set(colorHex);
  if (colorHex.toLowerCase() !== '#ffffff' && mat.emissive) {
    mat.emissive.set(colorHex);
    mat.emissiveIntensity = 0.35;
  }
}

/** Monta el cabello modular sobre el personaje. */
export async function mountHair(
  getGLTF: CargarClase, targetRig: THREE.Object3D, targetSkin: THREE.SkinnedMesh,
  hairType: string, headClass: string, caraSinFlequillo: boolean, hairColor: string,
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

  const esForaneo = srcClass !== 'Barbarian' && srcClass !== headClass;
  const hairGeom = extractHairGeometry(origHead, srcClass, false);
  const hMesh = origHead.clone();
  hMesh.geometry = esForaneo ? hairGeom.clone() : hairGeom;

  if (esForaneo) {
    const strategy = CharacterMeshStrategies[headClass] ?? CharacterMeshStrategies['Knight'];
    const sPelo = strategy.hairScale;
    const dyPelo = strategy.hairDy;
    const pPos = hMesh.geometry.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < pPos.count; i++) {
      pPos.setXYZ(
        i,
        pPos.getX(i) * sPelo,
        dyPelo + 1.68 + (pPos.getY(i) - 1.68) * sPelo,
        0.04 + (pPos.getZ(i) - 0.04) * sPelo,
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
    if (hairColor) tiñe(hMesh.material, hairColor);
  }
  const mat = hMesh.material as THREE.MeshStandardMaterial;
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -1.0;
  mat.polygonOffsetUnits = -1.0;

  // ponytail: el parámetro caraSinFlequillo hoy no altera el recorte (recortaCejas=false
  // como en el original); se conserva la firma para paridad con avatar-modular-core.js.
  void caraSinFlequillo;
  const remappedHair = remapSkinnedMesh(hMesh, targetSkin.skeleton);
  remappedHair.name = 'modular_hair';
  targetRig.add(remappedHair);
}

/** Monta la barba modular sobre el personaje. */
export async function mountBeard(
  getGLTF: CargarClase, targetRig: THREE.Object3D, targetSkin: THREE.SkinnedMesh,
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
  if (beardColor) tiñe(bMesh.material, beardColor);
  const mat = bMesh.material as THREE.MeshStandardMaterial;
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -1.0;
  mat.polygonOffsetUnits = -1.0;

  const remappedBeard = remapSkinnedMesh(bMesh, targetSkin.skeleton);
  remappedBeard.name = 'modular_beard';
  targetRig.add(remappedBeard);
}

/** Monta el tapaboca del Encapuchado como cosmético universal. */
export async function mountMask(
  getGLTF: CargarClase, targetRig: THREE.Object3D, targetSkin: THREE.SkinnedMesh, maskColor: string,
): Promise<void> {
  const srcGltf = await getGLTF('Rogue_Hooded');
  const origMask = srcGltf?.scene.getObjectByName('RogueHooded_Mask') as THREE.SkinnedMesh | undefined;
  if (!srcGltf || !origMask) return;
  const mMesh = origMask.clone();
  mMesh.material = (origMask.material as THREE.Material).clone();
  if (maskColor) {
    try {
      tiñe(mMesh.material, maskColor);
    } catch {
      /* ignorar si color inválido */
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

/** Factory: funciones de montaje enlazadas al cargador GLTF del entorno. */
export function createAvatarMounter(getGLTF: CargarClase): {
  mountHair(
    targetRig: THREE.Object3D, targetSkin: THREE.SkinnedMesh,
    hairType: string, headClass: string, caraSinFlequillo: boolean, hairColor: string,
  ): Promise<void>;
  mountBeard(
    targetRig: THREE.Object3D, targetSkin: THREE.SkinnedMesh, beardType: string, beardColor: string,
  ): Promise<void>;
  mountMask(
    targetRig: THREE.Object3D, targetSkin: THREE.SkinnedMesh, maskColor: string,
  ): Promise<void>;
} {
  return {
    mountHair: (targetRig, targetSkin, hairType, headClass, caraSinFlequillo, hairColor) =>
      mountHair(getGLTF, targetRig, targetSkin, hairType, headClass, caraSinFlequillo, hairColor),
    mountBeard: (targetRig, targetSkin, beardType, beardColor) =>
      mountBeard(getGLTF, targetRig, targetSkin, beardType, beardColor),
    mountMask: (targetRig, targetSkin, maskColor) =>
      mountMask(getGLTF, targetRig, targetSkin, maskColor),
  };
}
