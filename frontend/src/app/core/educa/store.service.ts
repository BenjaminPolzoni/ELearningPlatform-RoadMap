import { Injectable, computed, inject, signal } from '@angular/core';
import type { Attachment, Subject, Module, AttachmentType, Section as EducaSection } from './models';
import { educaBiomeToWorld3d } from './models';
import { StorageService } from './storage.service';
import { RoadmapStore } from '../data/roadmap.store';
import { SyncChannelService } from './sync-channel.service';
import { COURSE_SEED_ID } from '../../mocks/seed';
import type { Activity, Connection, Roadmap, Section as PlatformSection } from '../data/roadmap.models';
import type { Biome } from '../data/biomes';

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const c = [...arr];
  const [x] = c.splice(from, 1);
  c.splice(to, 0, x);
  return c.map((item, i) => ({ ...(item as object), order: i }) as T);
}

const ROADMAP_LS_KEY = 'roadmap-mock-v3';

@Injectable({ providedIn: 'root' })
export class StoreService {
  private storage = inject(StorageService);
  private roadmapStore = inject(RoadmapStore);
  private syncChannel = inject(SyncChannelService);

  readonly current = signal<Subject | null>(null);
  readonly counts = computed(() => {
    const a = this.current();
    if (!a) return { sections: 0, modules: 0, attachments: 0 };
    const modules = a.sections.reduce((n, u) => n + u.modules.length, 0);
    const attachments = a.sections.reduce(
      (n, u) => n + u.modules.reduce((m, x) => m + x.attachments.length, 0),
      0,
    );
    return { sections: a.sections.length, modules, attachments };
  });

  listAll(): Subject[] {
    return this.storage.list();
  }

  create(name: string, description: string): Subject {
    const now = new Date().toISOString();
    const a: Subject = {
      id: uid(),
      name: name.trim() || 'Sin título',
      description,
      sections: [],
      creationDate: now,
      modificationDate: now,
    };
    this.storage.save(a);
    this.current.set(a);
    this.syncToRoadmap(a);
    return a;
  }

  open(id: string): void {
    const found = this.storage.load(id);
    this.current.set(found);
    if (found) {
      this.syncToRoadmap(found);
    }
  }

  delete(id: string): void {
    this.storage.remove(id);
    if (this.current()?.id === id) this.current.set(null);
    this.syncChannel.broadcast({
      type: 'course_updated',
      courseId: id,
      timestamp: Date.now(),
    });
  }

  rename(name: string, description: string): void {
    this.update((a) => ({ ...a, name, description }));
  }

  // — Sections —
  addSection(title: string): void {
    this.update((a) => ({
      ...a,
      sections: [
        ...a.sections,
        {
          id: uid(),
          title,
          description: '',
          order: a.sections.length,
          modules: [],
          biome: 'meadow',
          color: '#6366f1',
        },
      ],
    }));
  }

  editSection(id: string, patch: Partial<EducaSection>): void {
    this.update((a) => ({
      ...a,
      sections: a.sections.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    }));
  }

  removeSection(id: string): void {
    const a = this.current();
    if (a) {
      this.syncChannel.broadcast({
        type: 'unit_deleted',
        courseId: a.id,
        unitId: id,
        timestamp: Date.now(),
      });
    }
    this.update((a) => ({ ...a, sections: a.sections.filter((u) => u.id !== id) }));
  }

  moveSection(id: string, dir: -1 | 1): void {
    this.update((a) => {
      const i = a.sections.findIndex((u) => u.id === id);
      return { ...a, sections: move(a.sections, i, i + dir) };
    });
  }

  // — Modules —
  addModule(sectionId: string, title: string): void {
    this.update((a) => ({
      ...a,
      sections: a.sections.map((u) =>
        u.id === sectionId
          ? {
              ...u,
              modules: [
                ...u.modules,
                {
                  id: uid(),
                  title,
                  description: '',
                  order: u.modules.length,
                  attachments: [],
                },
              ],
            }
          : u,
      ),
    }));
  }

  editModule(sectionId: string, moduleId: string, patch: Partial<Module>): void {
    this.update((a) => ({
      ...a,
      sections: a.sections.map((u) =>
        u.id === sectionId
          ? { ...u, modules: u.modules.map((m) => (m.id === moduleId ? { ...m, ...patch } : m)) }
          : u,
      ),
    }));
  }

  removeModule(sectionId: string, moduleId: string): void {
    this.update((a) => ({
      ...a,
      sections: a.sections.map((u) =>
        u.id === sectionId ? { ...u, modules: u.modules.filter((m) => m.id !== moduleId) } : u,
      ),
    }));
  }

  moveModule(sectionId: string, moduleId: string, dir: -1 | 1): void {
    this.update((a) => ({
      ...a,
      sections: a.sections.map((u) => {
        if (u.id !== sectionId) return u;
        const i = u.modules.findIndex((m) => m.id === moduleId);
        return { ...u, modules: move(u.modules, i, i + dir) };
      }),
    }));
  }

  // — Appendices —
  addAttachment(sectionId: string, moduleId: string, title: string, type: AttachmentType = 'document'): void {
    const anx: Attachment = { id: uid(), title, type };
    this.update((a) => ({
      ...a,
      sections: a.sections.map((u) =>
        u.id === sectionId
          ? {
              ...u,
              modules: u.modules.map((m) =>
                m.id === moduleId ? { ...m, attachments: [...m.attachments, anx] } : m,
              ),
            }
          : u,
      ),
    }));
  }

  editAttachment(sectionId: string, moduleId: string, attachmentId: string, patch: Partial<Attachment>): void {
    this.update((a) => ({
      ...a,
      sections: a.sections.map((u) =>
        u.id === sectionId
          ? {
              ...u,
              modules: u.modules.map((m) =>
                m.id === moduleId
                  ? { ...m, attachments: m.attachments.map((x) => (x.id === attachmentId ? { ...x, ...patch } : x)) }
                  : m,
              ),
            }
          : u,
      ),
    }));
  }

  removeAttachment(sectionId: string, moduleId: string, attachmentId: string): void {
    this.update((a) => ({
      ...a,
      sections: a.sections.map((u) =>
        u.id === sectionId
          ? {
              ...u,
              modules: u.modules.map((m) =>
                m.id === moduleId ? { ...m, attachments: m.attachments.filter((x) => x.id !== attachmentId) } : m,
              ),
            }
          : u,
      ),
    }));
  }

  private update(fn: (a: Subject) => Subject): void {
    const a = this.current();
    if (!a) return;
    const next = fn(a);
    this.current.set(next);
    this.storage.save(next);
    this.syncToRoadmap(next);
    this.syncChannel.broadcast({
      type: 'course_updated',
      courseId: next.id,
      timestamp: Date.now(),
    });
    this.syncChannel.broadcast({
      type: 'roadmap_updated',
      timestamp: Date.now(),
    });
  }

  /**
   * Synchronizes the active subject with the student's Roadmap.
   * Transforms Educa's Sections, Modules and Attachments into the 3D islands and activities format.
   */
  private syncToRoadmap(subject: Subject): void {
    const platformSections: PlatformSection[] = [];
    const connections: Connection[] = [];

    subject.sections.forEach((u, uIdx) => {
      const biome3d = educaBiomeToWorld3d(u.biome) as Biome;
      const activities: Activity[] = [];

      let actIndex = 0;
      for (const m of u.modules) {
        for (const anx of m.attachments) {
          const isExercise = anx.type === 'exercise';
          const actId = `${u.id}-${anx.id}`;
          activities.push({
            id: actId,
            name: anx.title,
            type: isExercise ? 'practical-challenge' : 'theory',
            isMandatory: isExercise,
            allowedRetries: isExercise ? 2 : 0,
            positionX: 100 + (actIndex % 4) * 170,
            positionY: 100 + Math.floor(actIndex / 4) * 150,
            challengeId: isExercise ? `desafio-${anx.id}` : undefined,
            description:
              anx.description ||
              (isExercise
                ? 'Completa este desafío para ganar experiencia.'
                : 'Material de consulta teórico.'),
            difficulty: isExercise ? 'BASIC' : undefined,
            resourceUrl: anx.url,
            resourceType: anx.type === 'video' ? 'video' : 'pdf',
          });

          if (actIndex > 0) {
            connections.push({
              id: `cx-${u.id}-${actIndex}`,
              nodeOriginId: activities[actIndex - 1].id,
              nodeDestinationId: actId,
            });
          }
          actIndex++;
        }
      }

      platformSections.push({
        id: u.id,
        name: u.title,
        order: uIdx + 1,
        xpThreshold: uIdx * 200,
        biome: biome3d,
        activities,
      });
    });

    const rm: Roadmap = {
      courseCohortId: COURSE_SEED_ID,
      name: subject.name,
      sections: platformSections,
      connections,
    };

    try {
      localStorage.setItem(ROADMAP_LS_KEY, JSON.stringify(rm));
      this.roadmapStore.reload();
    } catch {
      /* ignore */
    }
  }
}
