import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

@Injectable({
  providedIn: 'root',
})
export class AssetCacheService {
  private loader = new GLTFLoader();
  private cache = new Map<string, THREE.Group>();
  private clipCache = new Map<string, THREE.AnimationClip[]>();

  private normalizeUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
      return url;
    }
    return '/' + url;
  }

  async load(url: string): Promise<THREE.Group> {
    const normUrl = this.normalizeUrl(url);
    const hit = this.cache.get(normUrl);
    if (hit) {
      return SkeletonUtils.clone(hit) as THREE.Group;
    }
    const gltf = await this.loader.loadAsync(normUrl);
    const scene = gltf.scene;
    this.cache.set(normUrl, scene);
    return SkeletonUtils.clone(scene) as THREE.Group;
  }

  async loadClips(url: string): Promise<THREE.AnimationClip[]> {
    const normUrl = this.normalizeUrl(url);
    const hit = this.clipCache.get(normUrl);
    if (hit) return hit;
    try {
      const gltf = await this.loader.loadAsync(normUrl);
      this.clipCache.set(normUrl, gltf.animations);
      return gltf.animations;
    } catch {
      return [];
    }
  }

  dispose(): void {
    for (const group of this.cache.values()) {
      group.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
    }
    this.cache.clear();
    this.clipCache.clear();
  }
}
