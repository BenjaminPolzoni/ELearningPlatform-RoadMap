import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { AvatarModularConfig, readConfigModular, MODULAR_CONFIG_KEY, sanitizeConfigModular } from './avatar-config';
import {
  applyShoesTint,
  LoadCharacterClass,
  createAvatarMounter,
  extractFaceGeometry,
  isHeadMesh,
  remapSkinnedMesh,
  splitLegGeometry,
} from './avatar-modular-core';
import {
  AnimTick,
  LoadScene,
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

const BASE_CHARACTERS = '/mundo-3d/Assets/CharacterV2/Characters/gltf/';
const USEFUL_BASE = '/mundo-3d/Assets/CharacterV2/Assets/gltf/';
const BASE_MIXED = '/mundo-3d/Assets/Cosmetics/mixed/';
const BASE_STARS = '/mundo-3d/Assets/Cosmetics/stars/';

/** Assembled character ready to enter the scene. */
export interface AvatarBuild {
  /** Player group (rig + modular pieces + cosmetics + flying pet). */
  group: THREE.Group;
  /** Body (without pet): what gets hidden in first person. */
  body: THREE.Group;
  /** Body height already scaled to 0.32 (preview/city composition): normalizes the world. */
  baseHeight: number;
  /** Ground pet in world space (added to the scene by whoever owns the scene). */
  groundPet: THREE.Group | null;
  /** Per-frame advance: RGB + pets. Called by the world loop. */
  tick(t: number, dt: number): void;
  /** Detaches the ground pet and drops references (no GPU dispose: geometries are cached). */
  detach(): void;
}

/**
 * Assembles the 3D character created in the city for the hexagonal world.
 * Port of the orchestration of `public/mundo-3d/avatar-preview.html`
 * (applyModularParts, applyCosmetics, attachItems, applyPet + pets).
 */
@Injectable({ providedIn: 'root' })
export class AvatarModularService {
  private readonly loader = new GLTFLoader();
  private readonly classModels = new Map<string, GLTF | null>();
  private readonly mixed = new Map<string, THREE.Group | null>();
  private readonly stars = new Map<string, THREE.Group | null>();
  private readonly hats = new Map<string, { hMesh?: THREE.SkinnedMesh; vMesh?: THREE.SkinnedMesh; bMesh?: THREE.SkinnedMesh }>();

  /** Config saved by the city; `null` if the student has not created their character yet. */
  read(): AvatarModularConfig | null {
    return readConfigModular();
  }

  /** Persists the panel's config (same key the city writes). */
  save(config: AvatarModularConfig): AvatarModularConfig {
    const sanitized = sanitizeConfigModular(config);
    try {
      localStorage.setItem(MODULAR_CONFIG_KEY, JSON.stringify(sanitized));
    } catch {
      /* ignore: without storage the change does not survive a refresh */
    }
    return sanitized;
  }

  /**
   * Applies an archetype propagating class to head, torso, pants, shoes, default
   * hair and beard according to class — but KEEPS accessories, pet, hands and colors
   * (including the face covering). Same as the city preset: changing archetype
   * never erases what was already chosen.
   */
  applyArchetype(config: AvatarModularConfig, characterClass: string): AvatarModularConfig {
    const next: AvatarModularConfig = {
      ...config,
      characterClass: characterClass,
      headStyle: characterClass,
      hairStyle: 'default',
      topStyle: characterClass,
      pantsStyle: characterClass,
      shoesStyle: characterClass,
    };
    if (next.beardStyle !== 'mask') {
      next.beardStyle = characterClass === 'Barbarian' ? 'long' : characterClass === 'Ranger' ? 'short' : 'none';
    }
    return next;
  }

  /**
   * Applies a head change (same rule as the city
   * `index.html#select-head-style`): hair to default + beard according to head.
   */
  applyHead(config: AvatarModularConfig, head: string): AvatarModularConfig {
    const next: AvatarModularConfig = { ...config, headStyle: head, hairStyle: 'default' };
    if (head === 'Barbarian') next.beardStyle = 'long';
    else if (head === 'Ranger') next.beardStyle = 'short';
    return next;
  }

  private async getCharacterClass(characterClass: string): Promise<GLTF | null> {
    const hit = this.classModels.get(characterClass);
    if (hit !== undefined) return hit;
    try {
      const gltf = await this.loader.loadAsync(BASE_CHARACTERS + characterClass + '.glb');
      this.classModels.set(characterClass, gltf);
      return gltf;
    } catch {
      this.classModels.set(characterClass, null);
      return null;
    }
  }

  private readonly loadCharacterClass: LoadCharacterClass = (characterClass) => this.getCharacterClass(characterClass);

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

  private readonly loadMixed: LoadScene = async (file) => {
    const scene = await this.loadMixedGltf(file);
    return scene ? scene.clone(true) : null;
  };

  private async loadStar(color: string): Promise<THREE.Group | null> {
    const hit = this.stars.get(color);
    if (hit !== undefined) return hit;
    try {
      const gltf = await this.loader.loadAsync(BASE_STARS + 'star_' + color + '.gltf');
      gltf.scene.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) c.castShadow = true;
      });
      this.stars.set(color, gltf.scene);
      return gltf.scene;
    } catch {
      this.stars.set(color, null);
      return null;
    }
  }

  private readonly loadStarScene: LoadScene = async (file) => {
    const color = file.replace(/^star_/, '').replace(/\.gltf$/, '');
    const scene = await this.loadStar(color);
    return scene ? scene.clone(true) : null;
  };

  async buildAvatar(config: AvatarModularConfig): Promise<AvatarBuild> {
    const rgb = new Set<THREE.Object3D>();
    const addRgb = (o: THREE.Object3D): void => {
      if (o.userData['updateRGB']) rgb.add(o);
    };
    const topClass = config.topStyle || config.characterClass || 'Knight';
    const base = await this.getCharacterClass(topClass);
    const group = new THREE.Group();
    group.name = 'jugador_modular';
    // Preview/city composition: the body goes at 0.32 and the pet unscaled.
    // The world normalizes by baseHeight, so the pet/character proportion matches.
    let baseHeight = 0;
    // Without a base model there is no body to hide in first person.
    let body = group;
    if (base) {
      const model = SkeletonUtils.clone(base.scene) as THREE.Group;
      model.scale.setScalar(0.32);
      await this.applyModularParts(model, config);
      this.applyCosmetics(model, config, rgb);
      await this.attachItems(model, config, rgb);
      group.add(model);
      body = model;
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
      body,
      baseHeight,
      groundPet: pet.ground,
      tick,
      detach: () => {
        pet.ground?.parent?.remove(pet.ground);
        rgb.clear();
      },
    };
  }

  private rigFor(model: THREE.Group): { rig: THREE.Object3D; skin: THREE.SkinnedMesh } | null {
    const rig = model.getObjectByName('Rig_Medium') ?? model.getObjectByName('Rig');
    let skin: THREE.SkinnedMesh | null = null;
    model.traverse((c) => {
      if ((c as THREE.SkinnedMesh).isSkinnedMesh && !skin) skin = c as THREE.SkinnedMesh;
    });
    if (!rig || !skin) return null;
    return { rig, skin };
  }

  private async applyModularParts(model: THREE.Group, config: AvatarModularConfig): Promise<void> {
    const found = this.rigFor(model);
    if (!found) return;
    const { rig: targetRig, skin: targetSkin } = found;
    const { mountHair, mountBeard, mountMask } = createAvatarMounter(this.loadCharacterClass);

    // 1. Clear previous modular pieces
    const removeModular = (parent: THREE.Object3D): void => {
      const fuera: THREE.Object3D[] = [];
      parent.children.forEach((c) => {
        if (c.name && c.name.startsWith('modular_')) fuera.push(c);
      });
      fuera.forEach((c) => parent.remove(c));
    };
    removeModular(targetRig);
    const headBone = model.getObjectByName('head');
    if (headBone) removeModular(headBone);

    // 2. Hide the original base meshes of head and legs
    model.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        if (isHeadMesh(c.name)) c.visible = false;
        if (c.name.includes('Leg')) c.visible = false;
      }
    });

    // 3. Modular head, hair and face cosmetic
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

    const tintsHair = (config.hairColor || '#ffffff').toLowerCase() !== '#ffffff';
    const ownHairTints = hairType === 'default' && tintsHair &&
      ['Knight', 'Mage', 'Ranger', 'Rogue'].includes(effectiveHeadClass);
    const hairEffectiveType = ownHairTints ? effectiveHeadClass.toLowerCase() : hairType;

    const hairstylesWithHair = ['mage', 'ranger', 'knight', 'rogue'];
    const withoutBangs = hairstylesWithHair.includes(hairEffectiveType) &&
      hairEffectiveType !== effectiveHeadClass.toLowerCase();
    const stretchesFront = hairEffectiveType !== 'default';

    const headGltf = await this.getCharacterClass(effectiveHeadClass);
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
          // Mannequin head with proportional fit (pivot at the base of the neck).
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
          if (isHumanHead && hairEffectiveType !== 'default') {
            headMesh.geometry = extractFaceGeometry(origHead, effectiveHeadClass, false, withoutBangs, stretchesFront);
          }
          const remappedHead = remapSkinnedMesh(headMesh, targetSkin.skeleton);
          remappedHead.name = 'modular_head';
          targetRig.add(remappedHead);
        }
      }
    }

    if (hairEffectiveType !== 'default') {
      await mountHair(targetRig, targetSkin, hairEffectiveType, effectiveHeadClass, withoutBangs, config.hairColor || '#ffffff');
    }
    if (shouldMountSeparateBeard) {
      await mountBeard(targetRig, targetSkin, beardType, config.beardColor || '#ffffff');
    }
    if (shouldMountMask) {
      await mountMask(targetRig, targetSkin, config.beardColor || '#ffffff');
    }

    // 4. Modular pants
    const pantsClass = config.pantsStyle || config.characterClass || 'Knight';
    const pantsGltf = await this.getCharacterClass(pantsClass);
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

    // 5. Modular shoes
    const isSneakers = config.shoesStyle === 'sneakers';
    const shoesClass = isSneakers ? 'Rogue' : config.shoesStyle || config.characterClass || 'Knight';
    const shoesGltf = await this.getCharacterClass(shoesClass);
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
    const found = this.rigFor(model);
    if (!found) return null;
    const { rig: targetRig, skin: targetSkin } = found;

    const scaleGeom = (mesh: THREE.SkinnedMesh, s: number, originY: number, originZ: number): THREE.SkinnedMesh => {
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
      let hit = this.hats.get('helmet');
      if (!hit) {
        const gltf = await this.getCharacterClass('Knight');
        const hMesh = gltf?.scene.getObjectByName('Knight_Helmet') as THREE.SkinnedMesh | undefined;
        const vMesh = gltf?.scene.getObjectByName('Knight_HelmetVisor') as THREE.SkinnedMesh | undefined;
        if (!hMesh || !vMesh) return null;
        hit = {
          hMesh: scaleGeom(hMesh, 1.1, 1.68, 0.04),
          vMesh: scaleGeom(vMesh, 1.1, 1.68, 0.04),
        };
        this.hats.set('helmet', hit);
      }
      const group = new THREE.Group();
      group.name = 'custom_shared_hat';
      if (hit.hMesh) group.add(remapSkinnedMesh(hit.hMesh, targetSkin.skeleton));
      if (hit.vMesh) group.add(remapSkinnedMesh(hit.vMesh, targetSkin.skeleton));
      return group;
    }
    let hit = this.hats.get('bear_hat');
    if (!hit) {
      const gltf = await this.getCharacterClass('Barbarian');
      const bMesh = gltf?.scene.getObjectByName('Barbarian_BearHat') as THREE.SkinnedMesh | undefined;
      if (!bMesh) return null;
      hit = { bMesh: scaleGeom(bMesh, 1.15, 1.72, 0.05) };
      this.hats.set('bear_hat', hit);
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

    // Visibility of base meshes: layer according to backItem, heads always hidden
    // (helmet and bear hat go through getSharedHat scaled).
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
      const isMannequin = config.headStyle === 'Mannequin' ||
        (!config.headStyle && config.characterClass === 'Mannequin');
      void this.getSharedHat(requestedItem, model).then((sharedHat) => {
        if (sharedHat && config.headItem === requestedItem) {
          const currentRig = model.getObjectByName('Rig_Medium') ?? model.getObjectByName('Rig');
          if (currentRig) {
            const old = currentRig.getObjectByName('custom_shared_hat');
            if (old) currentRig.remove(old);
            if (isMannequin) sharedHat.scale.multiplyScalar(0.87);
            currentRig.add(sharedHat);
          }
        }
      });
    }

    const isMannequin = (c: AvatarModularConfig): boolean =>
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
        // The gltf files come crossed (guitar_A is blue, guitar_B is pink): the mapping is inverted.
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
        // +0.10 to compensate for the vertical squash (it pivots at the origin).
        headObj.position.set(0, 0.4, 0);
      } else if (config.headItem === 'saiyan_scouter') {
        headObj = createSaiyanScouter();
        headObj.position.set(0, 0, 0);
      } else if (config.headItem === 'gamer_glasses') {
        headObj = createGamerGlasses();
        headObj.position.set(0, 0, 0);
      } else if (config.headItem === 'star_orbit' || /^star_orbit_(yellow|blue|green|red)$/.test(config.headItem || '')) {
        const legacy = String(config.headItem || '').match(/^star_orbit_(yellow|blue|green|red)$/);
        headObj = createStarOrbit(legacy ? legacy[1] : config.starOrbitColor || 'yellow', this.loadStarScene);
        headObj.position.set(0, 0, 0);
      } else if (config.headItem === 'flower_antennae') {
        headObj = createFlowerAntennae(this.loadMixed);
        headObj.position.set(0, 0, 0);
      } else if (['skel_helmet', 'skel_mage_hat', 'skel_hood'].includes(config.headItem)) {
        const req = config.headItem;
        const src = req === 'skel_helmet' ? 'Skeleton_Warrior' : req === 'skel_mage_hat' ? 'Skeleton_Mage' : 'Skeleton_Rogue';
        const mName = req === 'skel_helmet'
          ? 'Skeleton_Warrior_Helmet'
          : req === 'skel_mage_hat' ? 'Skeleton_Mage_Hat' : 'Skeleton_Rogue_Hood';
        void this.getCharacterClass(src).then((gltf) => {
          if (config.headItem === req && gltf) {
            const h = gltf.scene.getObjectByName(mName);
            if (h) {
              const curH = model.getObjectByName('head');
              if (curH) {
                const old = curH.getObjectByName('custom_head_item');
                if (old) curH.remove(old);
                const cloned = h.clone();
                if (isMannequin(config)) cloned.scale.multiplyScalar(0.87);
                if (req === 'skel_hood') cloned.scale.multiplyScalar(1.15);
                cloned.name = 'custom_head_item';
                curH.add(cloned);
              }
            }
          }
        });
      }
      if (headObj) {
        if (isMannequin(config)) headObj.scale.multiplyScalar(0.87);
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
      const gltf = await this.loader.loadAsync(USEFUL_BASE + fileName);
      return gltf.scene;
    } catch {
      return null;
    }
  }

  private findHandSlot(model: THREE.Group, side: 'r' | 'l'): THREE.Object3D | null {
    // Three.js GLTFLoader sanitizes names with dots: 'handslot.r' → 'handslotr'.
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

    let flying: THREE.Group | null = null;
    let land: THREE.Group | null = null;
    if (petType === 'drone') flying = createFlyingDrone();
    else if (petType === 'owl') flying = createFlyingOwl();
    else if (petType === 'bat') flying = createFlyingBat();
    else if (petType === 'ghost') flying = createFlyingGhost();
    else if (petType === 'chicken') {
      land = createGroundChicken(this.loadMixed, config.chickenVariant || 'A');
      land.userData['playerRef'] = playerGroup;
    }
    if (flying) {
      playerGroup.add(flying);
      if (flying.userData['updateRGB']) rgb.add(flying);
    }

    const profiles: Record<string, { speed: number; radius: number; height: number; bob: number; bobFreq: number; wobble: number; bank: number; erratic?: boolean }> = {
      owl: { speed: 1.05, radius: 0.68, height: 0.98, bob: 0.07, bobFreq: 2.4, wobble: 0.14, bank: 0.45 },
      ghost: { speed: 0.8, radius: 0.52, height: 0.78, bob: 0.09, bobFreq: 2.2, wobble: 0.18, bank: 0.3, erratic: true },
      bat: { speed: 1.5, radius: 0.6, height: 0.9, bob: 0.08, bobFreq: 3.4, wobble: 0.16, bank: 0.55 },
      drone: { speed: 1.35, radius: 0.58, height: 0.86, bob: 0.035, bobFreq: 4.2, wobble: 0.05, bank: 0.35 },
    };

    // Auxiliary point to convert the orbit (world frame) to the player's local frame.
    const aWorld = new THREE.Vector3();

    const tick = (t: number, dt: number): void => {
      if (flying) {
        const kind = (flying.name || '').replace('pet_', '') || 'drone';
        const p = profiles[kind] ?? profiles['drone'];
        const ud = flying.userData as Record<string, number>;
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
        // World frame: the orbit and the front ignore the player's turn so that
        // turning does not drag it (whip effect). Valid for drone, owl, bat and ghost.
        const yawN = playerGroup.rotation.y;
        const wx = playerGroup.position.x + Math.cos(angle) * r;
        const wz = playerGroup.position.z + Math.sin(angle) * r * 0.92;
        const wy = playerGroup.position.y + p.height +
          Math.sin(t * p.bobFreq) * p.bob + Math.sin(t * (p.bobFreq * 2.3) + 1) * p.bob * 0.25;
        aWorld.set(wx, wy, wz);
        playerGroup.worldToLocal(aWorld);
        flying.position.copy(aWorld);
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
        // The parent only rotates in Y: subtracting your yaw leaves the front in the world frame.
        flying.rotation.set(
          ud['smoothPitch'] as number,
          (ud['smoothYaw'] as number) - yawN,
          ud['smoothRoll'] as number,
          'YXZ',
        );
        (flying.userData['updateAnim'] as AnimTick | undefined)?.(t, step);
      }
      if (land) this.updateGroundPet(land, t, dt, playerGroup);
    };
    return { ground: land, tick };
  }

  /**
   * Hen in world space: wanders in a disc around the player and follows them
   * in little hops if they move beyond the leash.
   * ponytail: no wall check (the hexagonal world is open and the leash is
   * short); if the hen crosses scenery, pass colliders through here.
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
