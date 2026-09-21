/**
 * avatar-modular-core.js
 * Módulo compartido de personalización y ensamblado de avatares 3D.
 * Aplica el patrón Strategy para las reglas de geometría de cada clase (Bárbaro, Mago, etc.)
 * y centraliza la lógica para eliminar duplicación entre index.html y avatar-preview.html.
 */

import * as THREE from 'three';

// Cachés de geometrías
export const faceGeomCache = new Map();
export const hairGeomCache = new Map();
export const beardGeomCache = new Map();
export const legSplitCache = new Map();

/**
 * Patrón Strategy: Encapsula las reglas específicas de recorte, escala y nuca para cada clase.
 */
export const CharacterMeshStrategies = {
  Barbarian: {
    isFace(avgX, avgY, avgZ, isSkin, isEye, isFaceFeature, isBandaBaja, isLado, keepBeard, isBeard) {
      return (
        isEye ||
        isFaceFeature ||
        isBandaBaja ||
        isLado ||
        (keepBeard && isBeard) ||
        (isSkin && avgY < 1.80 && avgZ >= 0.20 && Math.abs(avgX) <= 0.349)
      );
    },
    isHair(avgX, avgY, avgZ, isSkin, isEye, isFaceFeature, isBeard) {
      return (
        !isEye &&
        !isFaceFeature &&
        !isBeard &&
        !(isSkin && avgY < 1.80 && avgZ >= 0.20 && Math.abs(avgX) <= 0.349)
      );
    },
    hairScale: 1.09,
    hairDy: -0.03,
  },
  Mage: {
    isFace(avgX, avgY, avgZ, isSkin, isEye, isFaceFeature, isBandaBaja, isLado, keepBeard, isBeard) {
      const isTrasOreja =
        Math.abs(avgX) >= 0.28 &&
        Math.abs(avgX) <= 0.365 &&
        avgY >= 1.44 &&
        avgY <= 1.65 &&
        avgZ >= -0.25 &&
        avgZ <= -0.02;
      return isSkin || isEye || isFaceFeature || isBandaBaja || isLado || isTrasOreja || (keepBeard && isBeard);
    },
    postProcessFace(faceGeom) {
      const fPos = faceGeom.attributes.position;
      const fUv = faceGeom.attributes.uv;
      for (let i = 0; i < fPos.count; i++) {
        const u = fUv.getX(i);
        const x = fPos.getX(i);
        const y = fPos.getY(i);
        const z = fPos.getZ(i);

        // Remapear UV de pelo a piel en el cráneo detrás de las orejas
        if (
          u >= 0.13 &&
          u < 0.25 &&
          Math.abs(x) >= 0.27 &&
          Math.abs(x) <= 0.37 &&
          y >= 1.41 &&
          y <= 1.68 &&
          z >= -0.25 &&
          z <= 0.00
        ) {
          fUv.setXY(i, 0.06, 0.14);
        }

        // Extender nuca hacia arriba y atrás (solo cuello central posterior)
        if (Math.abs(x) <= 0.26 && z < -0.10 && y >= 1.25 && y <= 1.42) {
          const tY = Math.max(0, Math.min(1, (y - 1.25) / (1.385 - 1.25)));
          const tZ = Math.max(0, Math.min(1, (-z - 0.10) / 0.30));
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
    },
    hairScale: 1.04,
    hairDy: 0,
  },
  Rogue: {
    isFace(avgX, avgY, avgZ, isSkin, isEye, isFaceFeature, isBandaBaja, isLado, keepBeard, isBeard) {
      return CharacterMeshStrategies.Mage.isFace(
        avgX,
        avgY,
        avgZ,
        isSkin,
        isEye,
        isFaceFeature,
        isBandaBaja,
        isLado,
        keepBeard,
        isBeard,
      );
    },
    postProcessFace(faceGeom) {
      return CharacterMeshStrategies.Mage.postProcessFace(faceGeom);
    },
    hairScale: 1.04,
    hairDy: 0,
  },
  Knight: {
    isFace(avgX, avgY, avgZ, isSkin, isEye, isFaceFeature, isBandaBaja, isLado, keepBeard, isBeard) {
      return isSkin || isEye || isFaceFeature || isBandaBaja || isLado || (keepBeard && isBeard);
    },
    hairScale: 1.04,
    hairDy: 0,
  },
  Ranger: {
    isFace(avgX, avgY, avgZ, isSkin, isEye, isFaceFeature, isBandaBaja, isLado, keepBeard, isBeard) {
      return isSkin || isEye || isFaceFeature || isBandaBaja || isLado || (keepBeard && isBeard);
    },
    hairScale: 1.04,
    hairDy: 0,
  },
};

/**
 * Determina si el nombre de una malla corresponde a una cabeza base o accesorio de cabeza.
 */
export function isHeadMesh(name) {
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

/**
 * Reasigna los pesos e índices óseos de un SkinnedMesh para que use el esqueleto de destino.
 */
export function remapSkinnedMesh(mesh, targetSkeleton) {
  const cloned = mesh.clone();
  cloned.geometry = mesh.geometry.clone();

  const originalBones = mesh.skeleton.bones.map((b) => b.name);
  const targetBoneIndices = originalBones.map((name) =>
    targetSkeleton.bones.findIndex((b) => b.name === name),
  );

  const skinIndices = cloned.geometry.attributes.skinIndex;
  const newIndices = skinIndices.clone();
  for (let i = 0; i < skinIndices.count; i++) {
    for (let j = 0; j < 4; j++) {
      const origIdx = skinIndices.getComponent(i, j);
      const mappedIdx = targetBoneIndices[origIdx];
      newIndices.setComponent(i, j, mappedIdx !== -1 ? mappedIdx : 0);
    }
  }
  cloned.geometry.setAttribute('skinIndex', newIndices);
  cloned.bind(targetSkeleton, mesh.bindMatrix);
  return cloned;
}

/**
 * Separa la geometría de una pierna en pantalón y calzado según cutoffY.
 */
export function splitLegGeometry(mesh, cutoffY = 0.15) {
  const cacheKey = mesh.name + '_' + cutoffY;
  if (legSplitCache.has(cacheKey)) return legSplitCache.get(cacheKey);

  const geom = mesh.geometry;
  const pos = geom.attributes.position;
  const index = geom.index;

  const pantsIndices = [];
  const shoesIndices = [];

  const triCount = index ? index.count / 3 : pos.count / 3;

  for (let i = 0; i < triCount; i++) {
    const iA = index ? index.getX(i * 3) : i * 3;
    const iB = index ? index.getX(i * 3 + 1) : i * 3 + 1;
    const iC = index ? index.getX(i * 3 + 2) : i * 3 + 2;

    const avgY = (pos.getY(iA) + pos.getY(iB) + pos.getY(iC)) / 3;

    if (avgY >= cutoffY) {
      pantsIndices.push(iA, iB, iC);
    } else {
      shoesIndices.push(iA, iB, iC);
    }
  }

  const pantsGeom = geom.clone();
  pantsGeom.setIndex(pantsIndices);

  const shoesGeom = geom.clone();
  shoesGeom.setIndex(shoesIndices);

  const result = { pantsGeom, shoesGeom };
  legSplitCache.set(cacheKey, result);
  return result;
}

/**
 * Aplica tinte personalizado al calzado manteniendo la suela clara.
 */
export function applyShoesTint(shoesMesh, colorHex) {
  if (!shoesMesh || !shoesMesh.geometry || !colorHex) return;
  shoesMesh.material = shoesMesh.material.clone();
  shoesMesh.material.vertexColors = true;
  const geom = shoesMesh.geometry;
  const pos = geom.attributes.position;
  const targetColor = new THREE.Color(colorHex);
  const colorAttr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < 0.035) {
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
  shoesMesh.material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `
      #if defined( USE_COLOR )
        float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        diffuseColor.rgb = vColor.rgb * (lum * 0.7 + 0.4);
      #endif
      `
    );
  };
}

/**
 * Extrae la geometría de la cara para un cabezal humano.
 */
export function extractFaceGeometry(sourceHeadMesh, headClass, keepBeard = false, sinFlequillo = false, estiraFrente = false) {
  const cacheKey = `${headClass}_${keepBeard}_${sinFlequillo}_${estiraFrente}`;
  if (faceGeomCache.has(cacheKey)) return faceGeomCache.get(cacheKey);

  const geom = sourceHeadMesh.geometry;
  const pos = geom.attributes.position;
  const uv = geom.attributes.uv;
  const index = geom.index;

  const triCount = index ? index.count / 3 : pos.count / 3;
  const faceIndices = [];

  const strategy = CharacterMeshStrategies[headClass] || CharacterMeshStrategies.Knight;

  for (let i = 0; i < triCount; i++) {
    const iA = index ? index.getX(i * 3) : i * 3;
    const iB = index ? index.getX(i * 3 + 1) : i * 3 + 1;
    const iC = index ? index.getX(i * 3 + 2) : i * 3 + 2;

    const avgX = (pos.getX(iA) + pos.getX(iB) + pos.getX(iC)) / 3;
    const avgY = (pos.getY(iA) + pos.getY(iB) + pos.getY(iC)) / 3;
    const avgZ = (pos.getZ(iA) + pos.getZ(iB) + pos.getZ(iC)) / 3;
    const avgU = (uv.getX(iA) + uv.getX(iB) + uv.getX(iC)) / 3;
    const avgV = (uv.getY(iA) + uv.getY(iB) + uv.getY(iC)) / 3;

    const isSkin = avgU < 0.13 && avgU >= 0.01 && avgV <= 0.25;
    const isEye = avgU >= 0.25 && avgU <= 0.36 && avgV <= 0.22 && avgY < 1.75 && avgZ > 0.25;
    const isFaceFeature = Math.abs(avgX) <= 0.349 && avgY >= 1.50 && avgY <= 1.83 && avgZ >= 0.26;

    let isBeard = false;
    if (headClass === 'Barbarian') {
      isBeard = avgY < 1.54 && avgZ > 0.00 && !isSkin && !isEye;
    } else if (headClass === 'Ranger') {
      isBeard = avgY < 1.52 && avgZ > 0.10 && !isSkin && !isEye;
    }

    const isBandaBaja = isSkin && avgY < 1.52 && avgY >= 1.20;
    const isLado = isSkin && avgY < 1.75 && avgY >= 1.40 && Math.abs(avgX) > 0.30;

    let isFace = strategy.isFace(
      avgX,
      avgY,
      avgZ,
      isSkin,
      isEye,
      isFaceFeature,
      isBandaBaja,
      isLado,
      keepBeard,
      isBeard,
    );

    if (
      sinFlequillo &&
      isFaceFeature &&
      !isSkin &&
      !isEye &&
      avgU >= 0.13 &&
      avgU < 0.25 &&
      avgV <= 0.25 &&
      !(keepBeard && isBeard)
    ) {
      isFace = false;
    }

    if (isFace) {
      faceIndices.push(iA, iB, iC);
    }
  }

  const faceGeom = geom.clone();
  faceGeom.setIndex(faceIndices);

  if (estiraFrente) {
    const fPos = faceGeom.attributes.position;
    const fUv = faceGeom.attributes.uv;
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

  if (strategy.postProcessFace) {
    strategy.postProcessFace(faceGeom);
  }

  faceGeomCache.set(cacheKey, faceGeom);
  return faceGeom;
}

/**
 * Extrae la geometría del cabello de un cabezal donante.
 */
export function extractHairGeometry(sourceHeadMesh, hairClass, recortaCejas = false) {
  const cacheKey = `${hairClass}_${recortaCejas}`;
  if (hairGeomCache.has(cacheKey)) return hairGeomCache.get(cacheKey);

  const geom = sourceHeadMesh.geometry;
  const pos = geom.attributes.position;
  const uv = geom.attributes.uv;
  const index = geom.index;

  const triCount = index ? index.count / 3 : pos.count / 3;
  const hairIndices = [];

  for (let i = 0; i < triCount; i++) {
    const iA = index ? index.getX(i * 3) : i * 3;
    const iB = index ? index.getX(i * 3 + 1) : i * 3 + 1;
    const iC = index ? index.getX(i * 3 + 2) : i * 3 + 2;

    const avgX = (pos.getX(iA) + pos.getX(iB) + pos.getX(iC)) / 3;
    const avgY = (pos.getY(iA) + pos.getY(iB) + pos.getY(iC)) / 3;
    const avgZ = (pos.getZ(iA) + pos.getZ(iB) + pos.getZ(iC)) / 3;
    const avgU = (uv.getX(iA) + uv.getX(iB) + uv.getX(iC)) / 3;
    const avgV = (uv.getY(iA) + uv.getY(iB) + uv.getY(iC)) / 3;

    const isSkin = avgU < 0.13 && avgU >= 0.01 && avgV <= 0.25;
    const isEye = avgU >= 0.25 && avgU <= 0.36 && avgV <= 0.22 && avgY < 1.75 && avgZ > 0.25;
    const isFaceFeature = Math.abs(avgX) <= 0.349 && avgY >= 1.50 && avgY <= 1.83 && avgZ >= 0.26;

    let isBeard = false;
    if (hairClass === 'Barbarian') {
      isBeard = avgY < 1.54 && avgZ > 0.00 && !isSkin && !isEye;
    } else if (hairClass === 'Ranger') {
      isBeard = avgY < 1.52 && avgZ > 0.10 && !isSkin && !isEye;
    }

    const isHairUV = avgU >= 0.13 && avgU < 0.25 && avgV <= 0.25;
    let isHair = !isSkin && !isEye && (!isFaceFeature || isHairUV) && !isBeard;

    if (
      recortaCejas &&
      hairClass !== 'Barbarian' &&
      isHairUV &&
      Math.abs(avgX) <= 0.24 &&
      avgY >= 1.68 &&
      avgY <= 1.83 &&
      avgZ >= 0.33
    ) {
      isHair = false;
    }

    if (hairClass === 'Barbarian') {
      isHair =
        !isEye &&
        !isFaceFeature &&
        !isBeard &&
        !(isSkin && avgY < 1.80 && avgZ >= 0.20 && Math.abs(avgX) <= 0.349);
    }

    if (isHair) {
      hairIndices.push(iA, iB, iC);
    }
  }

  const hairGeom = geom.clone();
  hairGeom.setIndex(hairIndices);
  hairGeomCache.set(cacheKey, hairGeom);
  return hairGeom;
}

/**
 * Extrae la geometría de la barba (Bárbaro o Arquero).
 */
export function extractBeardGeometry(sourceHeadMesh, beardType) {
  if (beardGeomCache.has(beardType)) return beardGeomCache.get(beardType);

  const geom = sourceHeadMesh.geometry;
  const pos = geom.attributes.position;
  const uv = geom.attributes.uv;
  const index = geom.index;

  const triCount = index ? index.count / 3 : pos.count / 3;
  const beardIndices = [];

  for (let i = 0; i < triCount; i++) {
    const iA = index ? index.getX(i * 3) : i * 3;
    const iB = index ? index.getX(i * 3 + 1) : i * 3 + 1;
    const iC = index ? index.getX(i * 3 + 2) : i * 3 + 2;

    const avgY = (pos.getY(iA) + pos.getY(iB) + pos.getY(iC)) / 3;
    const avgZ = (pos.getZ(iA) + pos.getZ(iB) + pos.getZ(iC)) / 3;
    const avgU = (uv.getX(iA) + uv.getX(iB) + uv.getX(iC)) / 3;
    const avgV = (uv.getY(iA) + uv.getY(iB) + uv.getY(iC)) / 3;

    const isSkin = avgU < 0.13 && avgU >= 0.01 && avgV <= 0.25;
    const isEye = avgU >= 0.25 && avgU <= 0.36 && avgV <= 0.22 && avgY < 1.75 && avgZ > 0.25;

    let isBeard = false;
    if (beardType === 'long') {
      isBeard = avgY < 1.54 && avgZ > 0.00 && !isSkin && !isEye;
    } else if (beardType === 'short') {
      isBeard = avgY < 1.52 && avgZ > 0.10 && !isSkin && !isEye;
    }

    if (isBeard) {
      beardIndices.push(iA, iB, iC);
    }
  }

  const beardGeom = geom.clone();
  beardGeom.setIndex(beardIndices);
  beardGeomCache.set(beardType, beardGeom);
  return beardGeom;
}

/**
 * Monta el cabello modular sobre el personaje.
 */
export async function mountHair(getGLTF, targetRig, targetSkin, hairType, headClass, caraSinFlequillo, hairColor) {
  if (!hairType || hairType === 'default') return;
  const hairClassMap = {
    mage: 'Mage',
    ranger: 'Ranger',
    knight: 'Knight',
    rogue: 'Rogue',
    none: 'Barbarian',
    barbarian: 'Barbarian',
  };
  const srcClass = hairClassMap[hairType];
  if (!srcClass) return;

  const srcGltf = await getGLTF(srcClass);
  if (!srcGltf) return;
  const origHead = srcGltf.scene.getObjectByName(`${srcClass}_Head`);
  if (!origHead) return;

  const recortaCejas = false;
  const esForaneo = srcClass !== 'Barbarian' && srcClass !== headClass;
  const hairGeom = extractHairGeometry(origHead, srcClass, recortaCejas);
  const hMesh = origHead.clone();
  hMesh.geometry = esForaneo ? hairGeom.clone() : hairGeom;

  if (esForaneo) {
    const strategy = CharacterMeshStrategies[headClass] || CharacterMeshStrategies.Knight;
    const sPelo = strategy.hairScale || 1.04;
    const dyPelo = strategy.hairDy || 0;
    const pPos = hMesh.geometry.attributes.position;
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
    hMesh.material = targetSkin.material.clone();
  } else {
    hMesh.material = origHead.material.clone();
    if (hairColor) hMesh.material.color.set(hairColor);
    if (hairColor && hairColor.toLowerCase() !== '#ffffff') {
      hMesh.material.emissive.set(hairColor);
      hMesh.material.emissiveIntensity = 0.35;
    }
  }

  hMesh.material.polygonOffset = true;
  hMesh.material.polygonOffsetFactor = -1.0;
  hMesh.material.polygonOffsetUnits = -1.0;

  const remappedHair = remapSkinnedMesh(hMesh, targetSkin.skeleton);
  remappedHair.name = 'modular_hair';
  targetRig.add(remappedHair);
}

/**
 * Monta la barba modular sobre el personaje.
 */
export async function mountBeard(getGLTF, targetRig, targetSkin, beardType, beardColor) {
  if (!beardType || beardType === 'none') return;
  const srcClass = beardType === 'long' ? 'Barbarian' : 'Ranger';
  const srcGltf = await getGLTF(srcClass);
  if (!srcGltf) return;
  const origHead = srcGltf.scene.getObjectByName(`${srcClass}_Head`);
  if (!origHead) return;

  const beardGeom = extractBeardGeometry(origHead, beardType);
  const bMesh = origHead.clone();
  bMesh.geometry = beardGeom;
  bMesh.material = origHead.material.clone();
  if (beardColor) bMesh.material.color.set(beardColor);
  if (beardColor && beardColor.toLowerCase() !== '#ffffff') {
    bMesh.material.emissive.set(beardColor);
    bMesh.material.emissiveIntensity = 0.35;
  }
  bMesh.material.polygonOffset = true;
  bMesh.material.polygonOffsetFactor = -1.0;
  bMesh.material.polygonOffsetUnits = -1.0;

  const remappedBeard = remapSkinnedMesh(bMesh, targetSkin.skeleton);
  remappedBeard.name = 'modular_beard';
  targetRig.add(remappedBeard);
}

/**
 * Monta el tapaboca del Encapuchado como cosmético universal.
 */
export async function mountMask(getGLTF, targetRig, targetSkin, maskColor) {
  const srcGltf = await getGLTF('Rogue_Hooded');
  if (!srcGltf) return;
  const origMask = srcGltf.scene.getObjectByName('RogueHooded_Mask');
  if (!origMask) return;
  const mMesh = origMask.clone();
  mMesh.material = origMask.material.clone();
  if (maskColor) {
    try {
      mMesh.material.color.set(maskColor);
    } catch {
      /* ignorar si color inválido */
    }
    if (maskColor.toLowerCase() !== '#ffffff' && mMesh.material.emissive) {
      mMesh.material.emissive.set(maskColor);
      mMesh.material.emissiveIntensity = 0.35;
    }
  }
  mMesh.material.polygonOffset = true;
  mMesh.material.polygonOffsetFactor = -1.0;
  mMesh.material.polygonOffsetUnits = -1.0;
  const remappedMask = remapSkinnedMesh(mMesh, targetSkin.skeleton);
  remappedMask.name = 'modular_beard';
  targetRig.add(remappedMask);
}

/**
 * Patrón Factory: Crea las funciones de montaje enlazadas al loader de assets GLTF del entorno.
 */
export function createAvatarMounter(getGLTF) {
  return {
    mountHair: (targetRig, targetSkin, hairType, headClass, caraSinFlequillo, hairColor) =>
      mountHair(getGLTF, targetRig, targetSkin, hairType, headClass, caraSinFlequillo, hairColor),
    mountBeard: (targetRig, targetSkin, beardType, beardColor) =>
      mountBeard(getGLTF, targetRig, targetSkin, beardType, beardColor),
    mountMask: (targetRig, targetSkin, maskColor) =>
      mountMask(getGLTF, targetRig, targetSkin, maskColor),
  };
}
