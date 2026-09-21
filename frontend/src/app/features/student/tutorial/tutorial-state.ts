import { computed, signal } from '@angular/core';

export const TUTORIAL_KEY = 'roadmap.first-steps.v2';
export type TutorialStatus = 'pending' | 'active' | 'skipped' | 'completed';
export interface TutorialDestination {
  unitId: string;
  activityId: string;
  unitName: string;
  activityName: string;
  completed: boolean;
}
export interface TutorialScene {
  type: 'tutorialScene';
  ready: boolean;
  busy: boolean;
  zone: string;
  destinations: TutorialDestination[];
}
export function isTutorialScene(value: unknown): value is TutorialScene {
  if (!value || typeof value !== 'object') return false;
  const data = value as TutorialScene;
  return data.type === 'tutorialScene' && typeof data.ready === 'boolean' &&
    typeof data.busy === 'boolean' && typeof data.zone === 'string' &&
    Array.isArray(data.destinations) && data.destinations.every(d => d &&
      typeof d.unitId === 'string' && typeof d.activityId === 'string' &&
      typeof d.unitName === 'string' && typeof d.activityName === 'string' &&
      typeof d.completed === 'boolean');
}

/** UI-only progress: never awards XP or changes academic progress (RF-CUR-01). */
export class TutorialState {
  readonly status = signal<TutorialStatus>('pending');
  readonly step = signal<1 | 2 | 3>(1);
  readonly scene = signal<TutorialScene | null>(null);
  readonly attempt = signal(0);
  readonly helpEmpty = signal(false);
  readonly celebration = signal(false);
  private celebrationPending = false;
  private toastTimer?: ReturnType<typeof setTimeout>;
  readonly destination = computed(() => {
    const scene = this.scene();
    if (!scene?.ready) return null;
    const local = scene.destinations.filter(d => d.unitId === scene.zone);
    const candidates = local.length ? local : scene.destinations;
    return candidates.find(d => !d.completed) ?? candidates[0] ?? null;
  });

  constructor(private readonly storage?: Pick<Storage, 'getItem' | 'setItem'>) {
    try {
      const saved = JSON.parse(storage?.getItem(TUTORIAL_KEY) ?? 'null');
      if (saved && ['pending', 'active', 'skipped', 'completed'].includes(saved.status) &&
          [1, 2, 3].includes(saved.step)) {
        this.status.set(saved.status);
        this.step.set(saved.step);
      }
    } catch { /* Storage is optional: keep the tutorial usable in this session. */ }
  }

  receiveScene(scene: TutorialScene): void {
    this.scene.set(scene);
    if (!scene.ready || !this.destination()) return;
    this.helpEmpty.set(false);
    if (this.status() === 'pending') this.status.set('active');
    if (this.status() !== 'active') return;
    if (scene.destinations.some(d => d.unitId === scene.zone)) this.step.set(3);
    else if (this.step() === 3) this.step.set(2);
    this.save();
  }

  moved(attempt: number): void {
    if (attempt !== this.attempt() || this.status() !== 'active' || this.step() !== 1 ||
        !this.scene()?.ready || this.scene()?.busy || !this.destination()) return;
    this.step.set(2);
    this.save();
  }

  opened(unitId: string, activityId: string): void {
    if (this.status() !== 'active' || !this.scene()?.ready ||
        !this.scene()?.destinations.some(d => d.unitId === unitId && d.activityId === activityId)) return;
    this.status.set('completed');
    this.celebrationPending = true;
    this.save();
  }

  closedChallenge(): void {
    if (!this.celebrationPending) return;
    this.celebrationPending = false;
    this.celebration.set(true);
    this.toastTimer = setTimeout(() => this.celebration.set(false), 4000);
  }

  skip(): void {
    this.status.set('skipped');
    this.helpEmpty.set(false);
    this.save();
  }

  restart(): void {
    this.dispose();
    this.celebration.set(false);
    this.celebrationPending = false;
    if (!this.destination()) { this.helpEmpty.set(true); return; }
    this.attempt.update(n => n + 1);
    this.status.set('active');
    this.step.set(this.scene()?.destinations.some(d => d.unitId === this.scene()?.zone) ? 3 : 1);
    this.save();
  }

  dispose(): void { clearTimeout(this.toastTimer); }
  private save(): void {
    try { this.storage?.setItem(TUTORIAL_KEY, JSON.stringify({ status: this.status(), step: this.step() })); }
    catch { /* See per-browser persistence debt in 08-tutorial-primeros-pasos. */ }
  }
}
