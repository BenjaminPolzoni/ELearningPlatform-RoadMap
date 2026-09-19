import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { AvatarModularConfig, leerConfigModular, MODULAR_CONFIG_KEY, sanearConfigModular } from './avatar-config';
import {
  applyShoesTint,
  CargarClase,
  createAvatarMounter,
  extractFaceGeometry,
  isHeadMesh,
  remapSkinnedMesh,
  splitLegGeometry,
} from './avatar-modular-core';
import {
  AnimTick,
  CargarEscena,
  createBackpack,
  createFlowerAntennae,
  createFlyingBat,
  createFlyingDrone,
  createFlyingGhost,
  createFlyingOwl,
  createGamerGlasses,
  createGamerHeadphones,
  createGamerKeyboard,
  createGamingMouse,
  createGiantUSB,
  createGroundChicken,
  createKeyboardBack,
  createMate,
  createPokeball,
  createPropellerHat,
  createRedBullCan,
  createRubberDuck,
  createSaiyanScouter,
  createStarOrbit,
  RgbTick,
} from './avatar-procedural';

const BASE_PERSONAJES = '/mundo-3d/Assets/CharacterV2/Characters/gltf/';
const BASE_UTILES = '/mundo-3d/Assets/CharacterV2/Assets/gltf/';
const BASE_MIXED = '/mundo-3d/Assets/Cosmetics/mixed/';
const BASE_STARS = '/mundo-3d/Assets/Cosmetics/stars/';

/** Personaje ensamblado listo para entrar a escena. */
export interface AvatarBuild {
  /** Grupo del jugador (rig + piezas modulares + cosméticos + mascota voladora). */
  group: THREE.Group;
  /** Cuerpo (sin mascota): lo que se oculta en primera persona. */
  cuerpo: THREE.Group;
  /** Alto del cuerpo ya escalado a 0.32 (composición preview/ciudad): normaliza el mundo. */
  baseHeight: number;
  /** Mascota terrestre en espacio de mundo (la agrega a escena quien tenga la escena). */
  groundPet: THREE.Group | null;
  /** Avance por frame: RGB + mascotas. Lo llama el loop del mundo. */
  tick(t: number, dt: number): void;
  /** Desengancha la mascota terrestre y suelta referencias (sin dispose GPU: geometrías cacheadas). */
  detach(): void;
}

/**
 * Ensambla el personaje 3D creado en la ciudad para el mundo hexagonal.
 * Port de la orquestación de `public/mundo-3d/avatar-preview.html`
 * (applyModularParts, applyCosmetics, attachItems, applyPet + pets).
 */
@Injectable({ providedIn: 'root' })
export class AvatarModularService {
  private readonly loader = new GLTFLoader();
  private readonly clases = new Map<string, GLTF | null>();
  private readonly mixed = new Map<string, THREE.Group | null>();
  private readonly estrellas = new Map<string, THREE.Group | null>();
  private readonly gorros = new Map<string, { hMesh?: THREE.SkinnedMesh; vMesh?: THREE.SkinnedMesh; bMesh?: THREE.SkinnedMesh }>();

  /** Config guardada por la ciudad; `null` si el alumno aún no creó su personaje. */
  leer(): AvatarModularConfig | null {
    return leerConfigModular();
  }

  /** Persiste la config del panel (misma clave que escribe la ciudad). */
  guardar(config: AvatarModularConfig): AvatarModularConfig {
    const saneada = sanearConfigModular(config);
    try {
      localStorage.setItem(MODULAR_CONFIG_KEY, JSON.stringify(saneada));
    } catch {
      /* ignorar: sin storage el cambio no sobrevive al refresh */
    }
    return saneada;
  }

  /**
   * Aplica un arquetipo propagando clase a cabeza, torso, pantalón, zapatos, pelo
   * default y barba según clase — pero CONSERVA accesorios, mascota, manos y colores
   * (incluido el tapaboca). Igual que el preset de la ciudad: cambiar de arquetipo
   * nunca borra lo ya elegido.
   */
  aplicarArquetipo(config: AvatarModularConfig, clase: string): AvatarModularConfig {
    const next: AvatarModularConfig = {
      ...config,
      characterClass: clase,
      headStyle: clase,
      hairStyle: 'default',
      topStyle: clase,
      pantsStyle: clase,
      shoesStyle: clase,
    };
    if (next.beardStyle !== 'mask') {
      next.beardStyle = clase === 'Barbarian' ? 'long' : clase === 'Ranger' ? 'short' : 'none';
    }
    return next;
  }

  /**
   * Aplica un cambio de cabeza (misma regla que la ciudad
   * `index.html#select-head-style`): pelo a default + barba según cabeza.
   */
  aplicarCabeza(config: AvatarModularConfig, cabeza: string): AvatarModularConfig {
    const next: AvatarModularConfig = { ...config, headStyle: cabeza, hairStyle: 'default' };
    if (cabeza === 'Barbarian') next.beardStyle = 'long';
    else if (cabeza === 'Ranger') next.beardStyle = 'short';
    return next;
  }

  private async getClase(clase: string): Promise<GLTF | null> {
    const hit = this.clases.get(clase);
    if (hit !== undefined) return hit;
    try {
      const gltf = await this.loader.loadAsync(BASE_PERSONAJES + clase + '.glb');
      this.clases.set(clase, gltf);
      return gltf;
    } catch {
      this.clases.set(clase, null);
      return null;
    }
  }

  private readonly cargarClase: CargarClase = (clase) => this.getClase(clase);

  private async loadMixedGltf(fileName: string): Promise<THREE.Group | null> {
    const hit = this.mixed.get(fileName);
    if (hit !== undefined) return hit;
    try {
      const gltf = await this.loader.loadAsync(BASE_MIXED + fileName);
      gltf.scene.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) c.castShadow = true;
      });
      this.mixed.set(fileName, gltf.scene);
      return gltf.scene;
    } catch {
      this.mixed.set(fileName, null);
      return null;
    }
  }

  private readonly cargarMixed: CargarEscena = async (archivo) => {
    const scene = await this.loadMixedGltf(archivo);
    return scene ? scene.clone(true) : null;
  };

  private async loadStar(color: string): Promise<THREE.Group | null> {
    const hit = this.estrellas.get(color);
    if (hit !== undefined) return hit;
    try {
      const gltf = await this.loader.loadAsync(BASE_STARS + 'star_' + color + '.gltf');
      gltf.scene.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) c.castShadow = true;
      });
      this.estrellas.set(color, gltf.scene);
      return gltf.scene;
    } catch {
      this.estrellas.set(color, null);
      return null;
    }
  }

  private readonly cargarEstrella: CargarEscena = async (archivo) => {
    const color = archivo.replace(/^star_/, '').replace(/\.gltf$/, '');
    const scene = await this.loadStar(color);
    return scene ? scene.clone(true) : null;
  };

  async buildAvatar(config: AvatarModularConfig): Promise<AvatarBuild> {
    const rgb = new Set<THREE.Object3D>();
    const addRgb = (o: THREE.Object3D): void => {
      if (o.userData['updateRGB']) rgb.add(o);
    };
    const topClass = config.topStyle || config.characterClass || 'Knight';
    const base = await this.getClase(topClass);
    const group = new THREE.Group();
    group.name = 'jugador_modular';
    // Composición preview/ciudad: el cuerpo va a 0.32 y la mascota sin escalar.
    // El mundo normaliza por baseHeight, así la proporción mascota/personaje iguala.
    let baseHeight = 0;
    // Sin modelo base no hay cuerpo que ocultar en primera persona.
    let cuerpo = group;
    if (base) {
      const model = SkeletonUtils.clone(base.scene) as THREE.Group;
      model.scale.setScalar(0.32);
      await this.applyModularParts(model, config);
      this.applyCosmetics(model, config, rgb);
      await this.attachItems(model, config, rgb);
      group.add(model);
      cuerpo = model;
      baseHeight = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).y;
    }
    const pet = this.applyPet(group, config, rgb);

    const tick = (t: number, dt: number): void => {
      for (const o of rgb) {
        if (!o.parent) {
          rgb.delete(o);
          continue;
        }
        (o.userData['updateRGB'] as RgbTick)(t);
      }
      pet.tick(t, dt);
    };
    return {
      group,
      cuerpo,
      baseHeight,
      groundPet: pet.ground,
      tick,
      detach: () => {
        pet.ground?.parent?.remove(pet.ground);
        rgb.clear();
      },
    };
  }

  private rigDe(model: THREE.Group): { rig: THREE.Object3D; skin: THREE.SkinnedMesh } | null {
    const rig = model.getObjectByName('Rig_Medium') ?? model.getObjectByName('Rig');
    let skin: THREE.SkinnedMesh | null = null;
    model.traverse((c) => {
      if ((c as THREE.SkinnedMesh).isSkinnedMesh && !skin) skin = c as THREE.SkinnedMesh;
    });
    if (!rig || !skin) return null;
    return { rig, skin };
  }

  private async applyModularParts(model: THREE.Group, config: AvatarModularConfig): Promise<void> {
    const hallado = this.rigDe(model);
    if (!hallado) return;
    const { rig: targetRig, skin: targetSkin } = hallado;
    const { mountHair, mountBeard, mountMask } = createAvatarMounter(this.cargarClase);

    // 1. Limpiar piezas modulares anteriores
    const quitarModulares = (padre: THREE.Object3D): void => {
      const fuera: THREE.Object3D[] = [];
      padre.children.forEach((c) => {
        if (c.name && c.name.startsWith('modular_')) fuera.push(c);
      });
      fuera.forEach((c) => padre.remove(c));
    };
    quitarModulares(targetRig);
    const headBone = model.getObjectByName('head');
    if (headBone) quitarModulares(headBone);

    // 2. Ocultar mallas base originales de cabeza y piernas
    model.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        if (isHeadMesh(c.name)) c.visible = false;
        if (c.name.includes('Leg')) c.visible = false;
      }
    });

    // 3. Cabeza modular, cabello y cosmético de cara
    const headClass = config.headStyle || config.characterClass || 'Knight';
    const beardType = config.beardStyle !== undefined
      ? config.beardStyle
      : headClass === 'Barbarian' ? 'long' : headClass === 'Ranger' ? 'short' : 'none';
    const hairType = config.hairStyle || 'default';

    let effectiveHeadClass = headClass;
    let shouldMountSeparateBeard = false;
    const wantMask = beardType === 'mask';
    const isHoodedNative = headClass === 'Rogue_Hooded';
    const shouldMountMask = wantMask && !isHoodedNative;

    if (wantMask) {
      effectiveHeadClass = headClass;
      shouldMountSeparateBeard = false;
    } else if (headClass === 'Barbarian') {
      if (beardType === 'long') {
        effectiveHeadClass = 'Barbarian';
        shouldMountSeparateBeard = true;
      } else {
        effectiveHeadClass = 'Knight';
        shouldMountSeparateBeard = beardType === 'short';
      }
    } else if (headClass === 'Ranger') {
      if (beardType === 'short') {
        effectiveHeadClass = 'Ranger';
        shouldMountSeparateBeard = true;
      } else {
        effectiveHeadClass = 'Knight';
        shouldMountSeparateBeard = beardType === 'long';
      }
    } else {
      effectiveHeadClass = headClass;
      shouldMountSeparateBeard = beardType === 'long' || beardType === 'short';
    }

    const tiñePelo = (config.hairColor || '#ffffff').toLowerCase() !== '#ffffff';
    const peloPropioTiñe = hairType === 'default' && tiñePelo &&
      ['Knight', 'Mage', 'Ranger', 'Rogue'].includes(effectiveHeadClass);
    const hairTypeEfectivo = peloPropioTiñe ? effectiveHeadClass.toLowerCase() : hairType;

    const peinadosConPelo = ['mage', 'ranger', 'knight', 'rogue'];
    const sinFlequillo = peinadosConPelo.includes(hairTypeEfectivo) &&
      hairTypeEfectivo !== effectiveHeadClass.toLowerCase();
    const estiraFrente = hairTypeEfectivo !== 'default';

    const headGltf = await this.getClase(effectiveHeadClass);
    if (headGltf) {
      if (effectiveHeadClass === 'Rogue_Hooded') {
        const origHead = headGltf.scene.getObjectByName('RogueHooded_Head') as THREE.SkinnedMesh | undefined;
        if (origHead) {
          const remappedHead = remapSkinnedMesh(origHead, targetSkin.skeleton);
          remappedHead.name = 'modular_head';
          targetRig.add(remappedHead);
        }
        const origMask = headGltf.scene.getObjectByName('RogueHooded_Mask') as THREE.SkinnedMesh | undefined;
        if (origMask) {
          const remappedMask = remapSkinnedMesh(origMask, targetSkin.skeleton);
          remappedMask.name = 'modular_head_mask';
          targetRig.add(remappedMask);
        }
      } else if (effectiveHeadClass === 'Mannequin') {
        const origHead = headGltf.scene.getObjectByName('Mannequin_Medium_Head') as THREE.SkinnedMesh | undefined;
        if (origHead) {
          const remappedHead = remapSkinnedMesh(origHead, targetSkin.skeleton);
          remappedHead.name = 'modular_head';
          // Cabeza del maniquí con ajuste proporcional (pivote en la base del cuello).
          const pos = remappedHead.geometry.attributes['position'] as THREE.BufferAttribute;
          const pivotY = 1.2414;
          const scale = 0.87;
          for (let i = 0; i < pos.count; i++) {
            pos.setX(i, pos.getX(i) * scale);
            pos.setY(i, pivotY + (pos.getY(i) - pivotY) * scale);
            pos.setZ(i, pos.getZ(i) * scale);
          }
          pos.needsUpdate = true;
          remappedHead.geometry.computeVertexNormals();
          remappedHead.geometry.computeBoundingBox();
          remappedHead.geometry.computeBoundingSphere();
          targetRig.add(remappedHead);
        }
      } else if (effectiveHeadClass.startsWith('Skeleton_')) {
        let skullName = `${effectiveHeadClass}_Head`;
        if (effectiveHeadClass === 'Skeleton_Mage') skullName = 'Skeleton_Mage_Skull';
        [`${skullName}`, `${effectiveHeadClass}_Jaw`, `${effectiveHeadClass}_Eyes`].forEach((partName, idx) => {
          const origPart = headGltf.scene.getObjectByName(partName) as THREE.SkinnedMesh | undefined;
          if (origPart) {
            const remappedPart = remapSkinnedMesh(origPart, targetSkin.skeleton);
            remappedPart.name = `modular_head_part_${idx}`;
            targetRig.add(remappedPart);
          }
        });
        let innateHatName: string | null = null;
        if (effectiveHeadClass === 'Skeleton_Warrior') innateHatName = 'Skeleton_Warrior_Helmet';
        else if (effectiveHeadClass === 'Skeleton_Mage') innateHatName = 'Skeleton_Mage_Hat';
        else if (effectiveHeadClass === 'Skeleton_Rogue') innateHatName = 'Skeleton_Rogue_Hood';
        if (innateHatName && headBone) {
          const origHat = headGltf.scene.getObjectByName(innateHatName);
          if (origHat) {
            const clonedHat = origHat.clone();
            clonedHat.name = 'modular_head_hat';
            clonedHat.visible = !config.headItem || config.headItem === 'none';
            if (innateHatName === 'Skeleton_Rogue_Hood') clonedHat.scale.multiplyScalar(1.15);
            headBone.add(clonedHat);
          }
        }
      } else {
        const origHead = headGltf.scene.getObjectByName(`${effectiveHeadClass}_Head`) as THREE.SkinnedMesh | undefined;
        if (origHead) {
          const headMesh = origHead.clone();
          const isHumanHead = ['Knight', 'Barbarian', 'Mage', 'Ranger', 'Rogue'].includes(effectiveHeadClass);
          if (isHumanHead && hairTypeEfectivo !== 'default') {
            headMesh.geometry = extractFaceGeometry(origHead, effectiveHeadClass, false, sinFlequillo, estiraFrente);
          }
          const remappedHead = remapSkinnedMesh(headMesh, targetSkin.skeleton);
          remappedHead.name = 'modular_head';
          targetRig.add(remappedHead);
        }
      }
    }

    if (hairTypeEfectivo !== 'default') {
      await mountHair(targetRig, targetSkin, hairTypeEfectivo, effectiveHeadClass, sinFlequillo, config.hairColor || '#ffffff');
    }
    if (shouldMountSeparateBeard) {
      await mountBeard(targetRig, targetSkin, beardType, config.beardColor || '#ffffff');
    }
    if (shouldMountMask) {
      await mountMask(targetRig, targetSkin, config.beardColor || '#ffffff');
    }

    // 4. Pantalón modular
    const pantsClass = config.pantsStyle || config.characterClass || 'Knight';
    const pantsGltf = await this.getClase(pantsClass);
    if (pantsGltf) {
      for (const side of ['Left', 'Right']) {
        let legName = `${pantsClass}_Leg${side}`;
        if (pantsClass === 'Rogue_Hooded') legName = `RogueHooded_Leg${side}`;
        if (pantsClass === 'Mannequin') legName = `Mannequin_Medium_Leg${side}`;
        const origLeg = pantsGltf.scene.getObjectByName(legName) as THREE.SkinnedMesh | undefined;
        if (origLeg) {
          const { pantsGeom } = splitLegGeometry(origLeg, 0.15);
          const pMesh = origLeg.clone();
          pMesh.geometry = pantsGeom;
          const remappedPants = remapSkinnedMesh(pMesh, targetSkin.skeleton);
          remappedPants.name = `modular_pants_${side.toLowerCase()}`;
          targetRig.add(remappedPants);
        }
      }
    }

    // 5. Zapatos modulares
    const isSneakers = config.shoesStyle === 'sneakers';
    const shoesClass = isSneakers ? 'Rogue' : config.shoesStyle || config.characterClass || 'Knight';
    const shoesGltf = await this.getClase(shoesClass);
    if (shoesGltf) {
      for (const side of ['Left', 'Right']) {
        let legName = `${shoesClass}_Leg${side}`;
        if (shoesClass === 'Rogue_Hooded') legName = `RogueHooded_Leg${side}`;
        if (shoesClass === 'Mannequin') legName = `Mannequin_Medium_Leg${side}`;
        const origLeg = shoesGltf.scene.getObjectByName(legName) as THREE.SkinnedMesh | undefined;
        if (origLeg) {
          const { shoesGeom } = splitLegGeometry(origLeg, 0.15);
          const sMesh = origLeg.clone();
          sMesh.geometry = shoesGeom;
          const remappedShoes = remapSkinnedMesh(sMesh, targetSkin.skeleton);
          remappedShoes.name = `modular_shoes_${side.toLowerCase()}`;
          if (isSneakers || config.shoesColor) {
            applyShoesTint(remappedShoes, config.shoesColor || '#ffffff');
          }
          targetRig.add(remappedShoes);
        }
      }
    }
  }

  private async getSharedHat(
    type: 'helmet' | 'bear_hat', model: THREE.Group,
  ): Promise<THREE.Group | null> {
    const hallado = this.rigDe(model);
    if (!hallado) return null;
    const { rig: targetRig, skin: targetSkin } = hallado;

    const escalarGeom = (mesh: THREE.SkinnedMesh, s: number, originY: number, originZ: number): THREE.SkinnedMesh => {
      const g = mesh.geometry.clone();
      const pos = g.attributes['position'] as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        pos.setXYZ(i, pos.getX(i) * s, originY + (pos.getY(i) - originY) * s, originZ + (pos.getZ(i) - originZ) * s);
      }
      pos.needsUpdate = true;
      g.computeVertexNormals();
      const cloned = mesh.clone();
      cloned.geometry = g;
      return cloned;
    };

    if (type === 'helmet') {
      let hit = this.gorros.get('helmet');
      if (!hit) {
        const gltf = await this.getClase('Knight');
        const hMesh = gltf?.scene.getObjectByName('Knight_Helmet') as THREE.SkinnedMesh | undefined;
        const vMesh = gltf?.scene.getObjectByName('Knight_HelmetVisor') as THREE.SkinnedMesh | undefined;
        if (!hMesh || !vMesh) return null;
        hit = {
          hMesh: escalarGeom(hMesh, 1.1, 1.68, 0.04),
          vMesh: escalarGeom(vMesh, 1.1, 1.68, 0.04),
        };
        this.gorros.set('helmet', hit);
      }
      const group = new THREE.Group();
      group.name = 'custom_shared_hat';
      if (hit.hMesh) group.add(remapSkinnedMesh(hit.hMesh, targetSkin.skeleton));
      if (hit.vMesh) group.add(remapSkinnedMesh(hit.vMesh, targetSkin.skeleton));
      return group;
    }
    let hit = this.gorros.get('bear_hat');
    if (!hit) {
      const gltf = await this.getClase('Barbarian');
      const bMesh = gltf?.scene.getObjectByName('Barbarian_BearHat') as THREE.SkinnedMesh | undefined;
      if (!bMesh) return null;
      hit = { bMesh: escalarGeom(bMesh, 1.15, 1.72, 0.05) };
      this.gorros.set('bear_hat', hit);
    }
    const group = new THREE.Group();
    group.name = 'custom_shared_hat';
    if (hit.bMesh) group.add(remapSkinnedMesh(hit.bMesh, targetSkin.skeleton));
    return group;
  }

  private applyCosmetics(model: THREE.Group, config: AvatarModularConfig, rgb: Set<THREE.Object3D>): void {
    const rig = model.getObjectByName('Rig_Medium') ?? model.getObjectByName('Rig');
    if (rig) {
      const oldShared = rig.getObjectByName('custom_shared_hat');
      if (oldShared) rig.remove(oldShared);
    }

    // Visibilidad de mallas base: capa según backItem, cabezas siempre ocultas
    // (casco y gorro de oso van por getSharedHat escalados).
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && !child.name.startsWith('modular_')) {
        if (child.name.includes('Cape') || child.name.includes('Cloak')) {
          child.visible = config.backItem === 'cape';
        } else if (isHeadMesh(child.name)) {
          child.visible = false;
        }
      }
    });

    if (config.headItem === 'helmet' || config.headItem === 'bear_hat') {
      const requestedItem = config.headItem;
      const esManiqui = config.headStyle === 'Mannequin' ||
        (!config.headStyle && config.characterClass === 'Mannequin');
      void this.getSharedHat(requestedItem, model).then((sharedHat) => {
        if (sharedHat && config.headItem === requestedItem) {
          const currentRig = model.getObjectByName('Rig_Medium') ?? model.getObjectByName('Rig');
          if (currentRig) {
            const old = currentRig.getObjectByName('custom_shared_hat');
            if (old) currentRig.remove(old);
            if (esManiqui) sharedHat.scale.multiplyScalar(0.87);
            currentRig.add(sharedHat);
          }
        }
      });
    }

    const esManiqui = (c: AvatarModularConfig): boolean =>
      c.headStyle === 'Mannequin' || (!c.headStyle && c.characterClass === 'Mannequin');

    const chestBone = model.getObjectByName('chest');
    if (chestBone) {
      const oldBack = chestBone.getObjectByName('custom_back_item');
      if (oldBack) chestBone.remove(oldBack);

      let backObj: THREE.Object3D | null = null;
      if (config.backItem === 'backpack') {
        backObj = createBackpack(config.backpackColor || '#2563eb');
        backObj.position.set(0, 0.04, -0.28);
      } else if (config.backItem === 'keyboard_back') {
        backObj = createKeyboardBack();
        backObj.position.set(0, 0.05, -0.26);
      } else if (config.backItem === 'giant_usb' || config.backItem === 'giant_keychain') {
        backObj = createGiantUSB();
        backObj.position.set(0, 0.05, -0.22);
      } else if (typeof config.backItem === 'string' && config.backItem.endsWith('.gltf')) {
        const reqBack = config.backItem;
        void this.loadWeapon(reqBack, rgb).then((bObj) => {
          if (bObj && config.backItem === reqBack) {
            bObj.name = 'custom_back_item';
            bObj.position.set(0, -0.08, -0.45);
            bObj.rotation.set(0, Math.PI, 0);
            const curChest = model.getObjectByName('chest');
            if (curChest) {
              const old = curChest.getObjectByName('custom_back_item');
              if (old) curChest.remove(old);
              curChest.add(bObj);
            }
          }
        });
      } else if (config.backItem === 'guitar') {
        // Los gltf vienen cruzados (guitar_A es azul, guitar_B es rosa): se invierte el mapeo.
        const gVar = config.guitarColor === 'B' ? 'A' : 'B';
        void this.loadMixedGltf('guitar_' + gVar + '.gltf').then((gScene) => {
          if (gScene && config.backItem === 'guitar') {
            const g = gScene.clone(true);
            g.name = 'guitar_' + gVar;
            g.scale.setScalar(1.0);
            g.position.set(-0.4, 0.6, -0.32);
            g.rotation.set(0, Math.PI, -Math.PI / 5);
            const curChest = model.getObjectByName('chest');
            if (curChest) {
              const old = curChest.getObjectByName('custom_back_item');
              if (old) curChest.remove(old);
              curChest.add(g);
            }
          }
        });
      }
      if (backObj) {
        backObj.name = 'custom_back_item';
        chestBone.add(backObj);
        if (backObj.userData['updateRGB']) rgb.add(backObj);
      }
    }

    const headBone = model.getObjectByName('head');
    if (headBone) {
      const oldHead = headBone.getObjectByName('custom_head_item');
      if (oldHead) headBone.remove(oldHead);

      const innateHat = headBone.getObjectByName('modular_head_hat');
      if (innateHat) innateHat.visible = !config.headItem || config.headItem === 'none';

      let headObj: THREE.Object3D | null = null;
      if (config.headItem === 'headphones') {
        headObj = createGamerHeadphones();
        headObj.position.set(0, 0, 0);
      } else if (config.headItem === 'propeller_hat') {
        headObj = createPropellerHat();
        // +0.10 para compensar el aplasto vertical (pivota en el origen).
        headObj.position.set(0, 0.4, 0);
      } else if (config.headItem === 'saiyan_scouter') {
        headObj = createSaiyanScouter();
        headObj.position.set(0, 0, 0);
      } else if (config.headItem === 'gamer_glasses') {
        headObj = createGamerGlasses();
        headObj.position.set(0, 0, 0);
      } else if (config.headItem === 'star_orbit' || /^star_orbit_(yellow|blue|green|red)$/.test(config.headItem || '')) {
        const legado = String(config.headItem || '').match(/^star_orbit_(yellow|blue|green|red)$/);
        headObj = createStarOrbit(legado ? legado[1] : config.starOrbitColor || 'yellow', this.cargarEstrella);
        headObj.position.set(0, 0, 0);
      } else if (config.headItem === 'flower_antennae') {
        headObj = createFlowerAntennae(this.cargarMixed);
        headObj.position.set(0, 0, 0);
      } else if (['skel_helmet', 'skel_mage_hat', 'skel_hood'].includes(config.headItem)) {
        const req = config.headItem;
        const src = req === 'skel_helmet' ? 'Skeleton_Warrior' : req === 'skel_mage_hat' ? 'Skeleton_Mage' : 'Skeleton_Rogue';
        const mName = req === 'skel_helmet'
          ? 'Skeleton_Warrior_Helmet'
          : req === 'skel_mage_hat' ? 'Skeleton_Mage_Hat' : 'Skeleton_Rogue_Hood';
        void this.getClase(src).then((gltf) => {
          if (config.headItem === req && gltf) {
            const h = gltf.scene.getObjectByName(mName);
            if (h) {
              const curH = model.getObjectByName('head');
              if (curH) {
                const old = curH.getObjectByName('custom_head_item');
                if (old) curH.remove(old);
                const cloned = h.clone();
                if (esManiqui(config)) cloned.scale.multiplyScalar(0.87);
                if (req === 'skel_hood') cloned.scale.multiplyScalar(1.15);
                cloned.name = 'custom_head_item';
                curH.add(cloned);
              }
            }
          }
        });
      }
      if (headObj) {
        if (esManiqui(config)) headObj.scale.multiplyScalar(0.87);
        headObj.name = 'custom_head_item';
        headBone.add(headObj);
        if (headObj.userData['updateRGB']) rgb.add(headObj);
      }
    }
  }

  private async loadWeapon(fileName: string, rgb: Set<THREE.Object3D>): Promise<THREE.Object3D | null> {
    if (!fileName || fileName === 'none') return null;
    const RGB = (o: THREE.Object3D): THREE.Object3D => {
      if (o.userData['updateRGB']) rgb.add(o);
      return o;
    };
    if (fileName === 'keyboard_gamer' || fileName.includes('spellbook')) {
      const kb = createGamerKeyboard();
      kb.position.set(0, 0.06, -0.1);
      kb.scale.set(1.15, 1.15, 1.15);
      return RGB(kb);
    }
    if (fileName === 'mouse_gamer') {
      const mouse = createGamingMouse();
      mouse.position.set(0, 0.08, -0.12);
      mouse.scale.set(1.25, 1.25, 1.25);
      return RGB(mouse);
    }
    if (fileName === 'rubber_duck') {
      const duck = createRubberDuck();
      duck.position.set(0, 0.1, -0.12);
      duck.scale.set(1.25, 1.25, 1.25);
      return duck;
    }
    if (fileName === 'mate_argentino') {
      const mate = createMate();
      mate.position.set(0, 0.1, -0.12);
      mate.scale.set(1.25, 1.25, 1.25);
      return mate;
    }
    if (fileName === 'energy_can') {
      const can = createRedBullCan();
      can.position.set(0, 0.08, -0.12);
      can.scale.set(1.25, 1.25, 1.25);
      return can;
    }
    if (fileName === 'pokeball') {
      const poke = createPokeball();
      poke.position.set(0, 0.1, -0.12);
      poke.scale.set(1.25, 1.25, 1.25);
      return poke;
    }
    if (fileName === 'puzzlecube_complete.gltf') {
      const scene = await this.loadMixedGltf(fileName);
      if (!scene) return null;
      const r = scene.clone(true);
      r.scale.setScalar(0.6);
      r.position.set(0, 0.08, -0.05);
      return r;
    }
    try {
      const gltf = await this.loader.loadAsync(BASE_UTILES + fileName);
      return gltf.scene;
    } catch {
      return null;
    }
  }

  private findHandSlot(model: THREE.Group, side: 'r' | 'l'): THREE.Object3D | null {
    // Three.js GLTFLoader sanitiza nombres con puntos: 'handslot.r' → 'handslotr'.
    const candidates = side === 'r'
      ? ['handslotr', 'handslot.r', 'handslot_r', 'handr', 'hand.r']
      : ['handslotl', 'handslot.l', 'handslot_l', 'handl', 'hand.l'];
    for (const name of candidates) {
      const obj = model.getObjectByName(name);
      if (obj) return obj;
    }
    let found: THREE.Object3D | null = null;
    model.traverse((node) => {
      if (!found && node.name) {
        const n = node.name.toLowerCase();
        if (n.includes('handslot') && (n.includes(side) || n.endsWith(side))) found = node;
      }
    });
    return found;
  }

  private async attachItems(model: THREE.Group, config: AvatarModularConfig, rgb: Set<THREE.Object3D>): Promise<void> {
    const rHand = this.findHandSlot(model, 'r');
    const lHand = this.findHandSlot(model, 'l');
    if (rHand && config.rightHandItem && config.rightHandItem !== 'none') {
      const item = await this.loadWeapon(config.rightHandItem, rgb);
      if (item) {
        while (rHand.children.length > 0) rHand.remove(rHand.children[0]);
        rHand.add(item);
      }
    }
    if (lHand && config.leftHandItem && config.leftHandItem !== 'none') {
      const item = await this.loadWeapon(config.leftHandItem, rgb);
      if (item) {
        while (lHand.children.length > 0) lHand.remove(lHand.children[0]);
        lHand.add(item);
      }
    }
  }

  private applyPet(
    playerGroup: THREE.Group, config: AvatarModularConfig, rgb: Set<THREE.Object3D>,
  ): { ground: THREE.Group | null; tick: (t: number, dt: number) => void } {
    const petType = config.pet || 'none';
    if (petType === 'none') return { ground: null, tick: () => undefined };

    let voladora: THREE.Group | null = null;
    let terrestre: THREE.Group | null = null;
    if (petType === 'drone') voladora = createFlyingDrone();
    else if (petType === 'owl') voladora = createFlyingOwl();
    else if (petType === 'bat') voladora = createFlyingBat();
    else if (petType === 'ghost') voladora = createFlyingGhost();
    else if (petType === 'chicken') {
      terrestre = createGroundChicken(this.cargarMixed, config.chickenVariant || 'A');
      terrestre.userData['playerRef'] = playerGroup;
    }
    if (voladora) {
      playerGroup.add(voladora);
      if (voladora.userData['updateRGB']) rgb.add(voladora);
    }

    const perfiles: Record<string, { speed: number; radius: number; height: number; bob: number; bobFreq: number; wobble: number; bank: number; erratic?: boolean }> = {
      owl: { speed: 1.05, radius: 0.68, height: 0.98, bob: 0.07, bobFreq: 2.4, wobble: 0.14, bank: 0.45 },
      ghost: { speed: 0.8, radius: 0.52, height: 0.78, bob: 0.09, bobFreq: 2.2, wobble: 0.18, bank: 0.3, erratic: true },
      bat: { speed: 1.5, radius: 0.6, height: 0.9, bob: 0.08, bobFreq: 3.4, wobble: 0.16, bank: 0.55 },
      drone: { speed: 1.35, radius: 0.58, height: 0.86, bob: 0.035, bobFreq: 4.2, wobble: 0.05, bank: 0.35 },
    };

    // Punto auxiliar para pasar la órbita (marco de mundo) a local del jugador.
    const aMundo = new THREE.Vector3();

    const tick = (t: number, dt: number): void => {
      if (voladora) {
        const kind = (voladora.name || '').replace('pet_', '') || 'drone';
        const p = perfiles[kind] ?? perfiles['drone'];
        const ud = voladora.userData as Record<string, number>;
        let slow = 1;
        try {
          if (typeof window !== 'undefined' && window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches) slow = 0.4;
        } catch { /* noop */ }
        if (ud['orbitAngle'] === undefined) {
          ud['orbitAngle'] = 0;
          ud['prevWX'] = playerGroup.position.x + p.radius;
          ud['prevWY'] = playerGroup.position.y + p.height;
          ud['prevWZ'] = playerGroup.position.z;
          ud['smoothYaw'] = 0;
          ud['smoothRoll'] = 0;
          ud['smoothPitch'] = 0;
        }
        const step = Math.min(Math.max(dt || 0.016, 0.001), 0.05);
        const drift = 1 + Math.sin(t * 0.5) * 0.18 + Math.sin(t * 0.23 + 1.7) * 0.12;
        ud['orbitAngle'] = (ud['orbitAngle'] as number) + step * p.speed * drift * slow;
        const angle = ud['orbitAngle'] as number;
        let r = p.radius + Math.sin(t * 0.7) * p.wobble * 0.5 + Math.sin(t * 1.3 + 0.8) * p.wobble * 0.3;
        if (p.erratic) r += Math.sin(t * 2.1) * 0.05 + Math.sin(t * 3.7 + 2) * 0.03;
        r = Math.max(0.45, r);
        // Marco de mundo: la órbita y el frente ignoran el giro del jugador para que
        // doblar no la arrastre (efecto látigo). Vale para dron, búho, murciélago y fantasma.
        const yawN = playerGroup.rotation.y;
        const wx = playerGroup.position.x + Math.cos(angle) * r;
        const wz = playerGroup.position.z + Math.sin(angle) * r * 0.92;
        const wy = playerGroup.position.y + p.height +
          Math.sin(t * p.bobFreq) * p.bob + Math.sin(t * (p.bobFreq * 2.3) + 1) * p.bob * 0.25;
        aMundo.set(wx, wy, wz);
        playerGroup.worldToLocal(aMundo);
        voladora.position.copy(aMundo);
        const vx = (wx - (ud['prevWX'] as number)) / step;
        const vz = (wz - (ud['prevWZ'] as number)) / step;
        const vy = (wy - (ud['prevWY'] as number)) / step;
        ud['prevWX'] = wx;
        ud['prevWZ'] = wz;
        ud['prevWY'] = wy;
        const targetYaw = Math.atan2(vx, vz);
        let dy = targetYaw - ((ud['smoothYaw'] as number) ?? targetYaw);
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        const k = 1 - Math.exp(-6 * step);
        ud['smoothYaw'] = ((ud['smoothYaw'] as number) ?? targetYaw) + dy * k;
        const turnRate = THREE.MathUtils.clamp(dy / Math.max(step, 0.001), -4, 4);
        const targetRoll = THREE.MathUtils.clamp(-turnRate * 0.18 * p.bank * 2.2, -0.5, 0.5) - 0.08;
        const targetPitch = THREE.MathUtils.clamp(-vy * 0.35, -0.3, 0.3);
        ud['smoothRoll'] = ((ud['smoothRoll'] as number) || 0) + (targetRoll - ((ud['smoothRoll'] as number) || 0)) * k;
        ud['smoothPitch'] = ((ud['smoothPitch'] as number) || 0) + (targetPitch - ((ud['smoothPitch'] as number) || 0)) * k;
        // El padre solo rota en Y: restar tu yaw deja el frente en marco de mundo.
        voladora.rotation.set(
          ud['smoothPitch'] as number,
          (ud['smoothYaw'] as number) - yawN,
          ud['smoothRoll'] as number,
          'YXZ',
        );
        (voladora.userData['updateAnim'] as AnimTick | undefined)?.(t, step);
      }
      if (terrestre) this.updateGroundPet(terrestre, t, dt, playerGroup);
    };
    return { ground: terrestre, tick };
  }

  /**
   * Gallina en espacio de mundo: pasea en un disco alrededor del jugador y lo sigue
   * a saltitos si se aleja más allá de la correa.
   * ponytail: sin chequeo de paredes (el mundo hexagonal es abierto y la correa es
   * corta); si la gallina atraviesa escenografía, pasar colisionadores por acá.
   */
  private updateGroundPet(obj: THREE.Group, time: number, delta: number, player: THREE.Group): void {
    const ud = obj.userData as Record<string, number | undefined>;
    const dt = Math.min(delta, 0.1);
    const ppx = player.position.x;
    const ppz = player.position.z;
    const yaw = player.rotation.y;
    const vax = ppx - Math.sin(yaw) * 0.85;
    const vaz = ppz - Math.cos(yaw) * 0.85;
    if (ud['groundYaw'] === undefined) {
      ud['groundYaw'] = Math.PI;
      obj.rotation.y = Math.PI;
      obj.position.set(vax + 0.3, 0, vaz + 0.15);
      ud['groundHop'] = 0;
      ud['thinkAt'] = 0;
      ud['peckAt'] = time + 3 + Math.random() * 3;
      ud['peckUntil'] = 0;
    }
    if (Math.hypot(obj.position.x - ppx, obj.position.z - ppz) > 8) {
      obj.position.set(vax, 0, vaz);
      ud['tx'] = undefined;
    }

    const LEASH = 1.6;
    const WANDER_R = 0.9;
    const PERSONAL = 0.35;
    const distP = Math.hypot(obj.position.x - ppx, obj.position.z - ppz);

    if (ud['lastPpx'] === undefined) {
      ud['lastPpx'] = ppx;
      ud['lastPpz'] = ppz;
      ud['lastMoveAt'] = -10;
      ud['lockStart'] = undefined;
    }
    const playerMoved = Math.hypot(ppx - (ud['lastPpx'] as number), ppz - (ud['lastPpz'] as number)) > 0.005;
    ud['lastPpx'] = ppx;
    ud['lastPpz'] = ppz;
    if (playerMoved) {
      if (ud['lockStart'] === undefined) ud['lockStart'] = time;
      ud['lastMoveAt'] = time;
    } else if (time - (ud['lastMoveAt'] as number) > 1.0) {
      ud['lockStart'] = undefined;
    }
    const mayWalk = ud['lockStart'] !== undefined && time - (ud['lockStart'] as number) >= 2;
    const fresh = ud['lockStart'] === undefined && ud['lastMoveAt'] === -10;

    const hasTarget = ud['tx'] !== undefined;
    const arrived = hasTarget &&
      Math.hypot((ud['tx'] as number) - obj.position.x, (ud['tz'] as number) - obj.position.z) < 0.08;
    if ((!hasTarget || arrived) && time >= (ud['thinkAt'] as number)) {
      ud['tx'] = undefined;
      for (let k = 0; k < 6; k++) {
        const a = Math.random() * Math.PI * 2;
        const r = PERSONAL + Math.random() * (WANDER_R - PERSONAL);
        ud['tx'] = ppx + Math.cos(a) * r;
        ud['tz'] = ppz + Math.sin(a) * r;
        break;
      }
      ud['thinkAt'] = time + 2 + Math.random() * 2;
    }

    let gx = (ud['tx'] as number) ?? vax;
    let gz = (ud['tz'] as number) ?? vaz;
    let maxSpeed = 0.5;
    if (distP > LEASH) {
      gx = vax;
      gz = vaz;
      maxSpeed = 4.5;
    }
    const dx = gx - obj.position.x;
    const dz = gz - obj.position.z;
    const dist = Math.hypot(dx, dz);
    const wantWalk = dist > 0.08;
    const hopping = wantWalk && (fresh || mayWalk || ((ud['wasHopping'] as number) === 1 && ud['lockStart'] === undefined));
    ud['wasHopping'] = hopping ? 1 : 0;
    const speed = Math.min(maxSpeed, 0.15 + dist * (maxSpeed > 1 ? 2.5 : 1.5));
    const hopAmp = 0.02 + 0.04 * Math.min(1, speed / 1.5);
    let advanced = false;
    if (hopping) {
      const step = Math.min(dist, speed * dt);
      const nx = dx / (dist || 1);
      const nz = dz / (dist || 1);
      obj.position.x += nx * step;
      obj.position.z += nz * step;
      advanced = true;
      const targetYaw = Math.atan2(nx, nz);
      let cur = ud['groundYaw'] as number;
      let d = targetYaw - cur;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      cur += d * (1 - Math.exp(-6 * dt));
      ud['groundYaw'] = cur;
      obj.rotation.y = cur;
      ud['groundHop'] = ((ud['groundHop'] as number) ?? 0) + step * 22;
    }
    obj.position.y = advanced ? Math.abs(Math.sin(ud['groundHop'] as number)) * hopAmp : Math.sin(time * 2) * 0.008;
    obj.rotation.z = 0;

    if (!advanced && time >= (ud['peckAt'] as number)) {
      ud['peckUntil'] = time + 0.6;
      ud['peckAt'] = time + 4 + Math.random() * 3;
    }
    const pecking = !advanced && time < (ud['peckUntil'] as number);
    obj.rotation.x = pecking ? Math.sin(((time - ((ud['peckUntil'] as number) - 0.6)) / 0.6) * Math.PI) * 0.35 : 0;
  }
}
