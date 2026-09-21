import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { RoadmapDataPort } from './roadmap-data.port';
import { Activity, Student, Connection, NewActivity, NewSection, Progress, Roadmap, Section } from './roadmap.models';
import { studentsSeed, seedProgress, roadmapSeed } from '../mocks/seed';

const LS_KEY = 'roadmap-mock-v3';
const PROGRESS_LS_KEY = 'progress-mock-v3';

// Default position grid for nodes without posicion_x/y (new creations, or old localStorage
// data from before this editor) — non-overlapping, in columns of 4 (same width
// the serpentine of `section-map.ts` used before the editor exposed the position).
const GRID_COLS = 4;
const GRID_CW = 170;
const GRID_CH = 150;
const GRID_X0 = 100;
const GRID_Y0 = 100;

function positionDefault(index: number): { positionX: number; positionY: number } {
  return {
    positionX: GRID_X0 + (index % GRID_COLS) * GRID_CW,
    positionY: GRID_Y0 + Math.floor(index / GRID_COLS) * GRID_CH,
  };
}

/** Business error simulating the backend's ProblemDetail (400/409, see openapi). */
class RoadmapApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/**
 * Implementation of {@link RoadmapDataPort} for Phases 0-2. Starts from the seed, mutates in
 * memory and persists the graph in localStorage — survives a refresh without a backend.
 * Returns copies (`structuredClone`) so no component mutates the internal state.
 */
@Injectable()
export class InMemoryRoadmapAdapter extends RoadmapDataPort {
  private roadmap: Roadmap = this.load();
  private readonly students: Student[] = studentsSeed();

  getRoadmap(courseCohortId: string): Observable<Roadmap> {
    this.roadmap = this.load();
    if (courseCohortId !== this.roadmap.courseCohortId) {
      return throwError(() => new Error(`No hay roadmap mock para ${courseCohortId}`));
    }
    return of(structuredClone(this.roadmap));
  }

  addSection(courseCohortId: string, dto: NewSection): Observable<Section> {
    const order = this.roadmap.sections.length + 1;
    const section: Section = {
      id: `u${order}-${Date.now().toString(36)}`,
      name: dto.name,
      xpThreshold: dto.xpThreshold,
      order,
      activities: [],
      biome: dto.biome,
    };
    this.roadmap.sections.push(section);
    this.save();
    return of(structuredClone(section));
  }

  updateSection(_cc: string, sectionId: string, dto: NewSection): Observable<Section> {
    const section = this.section(sectionId);
    if (!section) return throwError(() => new RoadmapApiError(`No existe la unidad ${sectionId}`, 404));
    section.name = dto.name.trim();
    section.xpThreshold = Math.max(0, Math.trunc(dto.xpThreshold));
    section.biome = dto.biome;
    this.save();
    return of(structuredClone(section));
  }

  removeSection(_courseCohortId: string, sectionId: string): Observable<void> {
    // Cascading removal: also the connections touching its nodes (RF-NFR-01, 400/404 of the
    // openapi for sections — here it is reflected as graph cleanup in the mock).
    const nodeIds = new Set(this.section(sectionId)?.activities.map((a) => a.id) ?? []);
    this.roadmap.sections = this.roadmap.sections.filter((u) => u.id !== sectionId);
    this.roadmap.connections = this.roadmap.connections.filter(
      (c) => !nodeIds.has(c.nodeOriginId) && !nodeIds.has(c.nodeDestinationId),
    );
    this.save();
    return of(void 0);
  }

  moveSection(_cc: string, sectionId: string, direction: 'up' | 'down'): Observable<void> {
    const arr = this.roadmap.sections;
    const i = arr.findIndex((u) => u.id === sectionId);
    const j = direction === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= arr.length) return of(void 0);
    [arr[i], arr[j]] = [arr[j], arr[i]];
    arr.forEach((u, idx) => (u.order = idx + 1));
    this.save();
    return of(void 0);
  }

  addActivity(_cc: string, sectionId: string, dto: NewActivity): Observable<Activity> {
    const section = this.section(sectionId);
    if (!section) return throwError(() => new RoadmapApiError(`No existe la unidad ${sectionId}`, 404));
    const activity: Activity = {
      id: `${sectionId}-a${Date.now().toString(36)}`,
      ...this.normalize(dto),
      ...positionDefault(section.activities.length),
    };
    section.activities.push(activity);
    this.save();
    return of(structuredClone(activity));
  }

  updateActivity(_cc: string, sectionId: string, activityId: string, dto: NewActivity): Observable<Activity> {
    const section = this.section(sectionId);
    const activity = section?.activities.find((a) => a.id === activityId);
    if (!section || !activity) return throwError(() => new RoadmapApiError(`No existe la actividad ${activityId}`, 404));
    Object.assign(activity, { id: activity.id, ...this.normalize(dto, activity) });
    this.save();
    return of(structuredClone(activity));
  }

  removeActivity(_cc: string, sectionId: string, activityId: string): Observable<void> {
    const section = this.section(sectionId);
    if (section) {
      section.activities = section.activities.filter((a) => a.id !== activityId);
      // Logical removal of the node → also the connections touching it (mirrors DELETE /nodos/{id}).
      this.roadmap.connections = this.roadmap.connections.filter(
        (c) => c.nodeOriginId !== activityId && c.nodeDestinationId !== activityId,
      );
      this.save();
    }
    return of(void 0);
  }

  moveActivity(_cc: string, sectionId: string, activityId: string, direction: 'up' | 'down'): Observable<void> {
    const section = this.section(sectionId);
    if (!section) return of(void 0);
    const i = section.activities.findIndex((a) => a.id === activityId);
    const j = direction === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= section.activities.length) return of(void 0);
    const arr = section.activities;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    this.save();
    return of(void 0);
  }

  moveNode(_cc: string, sectionId: string, activityId: string, x: number, y: number): Observable<void> {
    const activity = this.section(sectionId)?.activities.find((a) => a.id === activityId);
    if (!activity) return throwError(() => new RoadmapApiError(`No existe el nodo ${activityId}`, 404));
    activity.positionX = x;
    activity.positionY = y;
    this.save();
    return of(void 0);
  }

  addConnection(_cc: string, nodeOriginId: string, nodeDestinationId: string): Observable<Connection> {
    if (nodeOriginId === nodeDestinationId) {
      return throwError(() => new RoadmapApiError('Un nodo no puede ser prerequisito de sí mismo', 400));
    }
    if (!this.node(nodeOriginId) || !this.node(nodeDestinationId)) {
      return throwError(() => new RoadmapApiError('El nodo no existe en este roadmap', 404));
    }
    const alreadyExists = this.roadmap.connections.some(
      (c) => c.nodeOriginId === nodeOriginId && c.nodeDestinationId === nodeDestinationId,
    );
    if (alreadyExists) {
      return throwError(() => new RoadmapApiError('Ya existe esa conexión', 409));
    }
    if (this.wouldCreateCycle(nodeOriginId, nodeDestinationId)) {
      return throwError(() => new RoadmapApiError('Esa conexión cerraría un ciclo de prerequisitos', 400));
    }
    const connection: Connection = { id: `cx-${Date.now().toString(36)}`, nodeOriginId, nodeDestinationId };
    this.roadmap.connections.push(connection);
    this.save();
    return of(structuredClone(connection));
  }

  removeConnection(_cc: string, connectionId: string): Observable<void> {
    this.roadmap.connections = this.roadmap.connections.filter((c) => c.id !== connectionId);
    this.save();
    return of(void 0);
  }

  private readonly subjectProgress = new BehaviorSubject<Progress>(this.loadProgress('stu-01'));

  getProgress(studentId: string, _courseCohortId: string): Observable<Progress> {
    if (studentId === 'stu-01') {
      return this.subjectProgress.asObservable();
    }
    return of(structuredClone(this.loadProgress(studentId)));
  }

  registerProgress(
    studentId: string,
    _courseCohortId: string,
    earnedXp: number,
    nodeId?: string,
    lives?: number,
  ): Observable<Progress> {
    const p = this.loadProgress(studentId);
    p.xpTotal += Math.max(0, earnedXp);
    if (typeof lives === 'number') {
      p.currentLives = Math.max(0, Math.min(3, lives));
    }
    if (nodeId) {
      const n = p.nodes.find((item) => item.nodeId === nodeId);
      if (n) {
        n.status = 'completed';
      } else {
        p.nodes.push({ nodeId, status: 'completed' });
      }
    }
    this.saveProgress(studentId, p);
    if (studentId === 'stu-01') {
      this.subjectProgress.next(structuredClone(p));
    }
    return of(structuredClone(p));
  }

  markContentRead(studentId: string, courseCohortId: string, nodeId: string): Observable<Progress> {
    if (courseCohortId !== this.roadmap.courseCohortId) {
      return throwError(() => new RoadmapApiError('No existe el curso-cohorte', 404));
    }
    const activity = this.node(nodeId);
    if (!activity || activity.type !== 'theory') {
      return throwError(() => new RoadmapApiError('El nodo no es contenido teórico', 400));
    }
    const p = this.loadProgress(studentId);
    const status = p.nodes.find((item) => item.nodeId === nodeId)?.status;
    if (status === 'locked') {
      return throwError(() => new RoadmapApiError('La unidad todavía no está desbloqueada', 403));
    }
    p.readingsContent ??= [];
    if (!p.readingsContent.some((reading) => reading.nodeId === nodeId)) {
      p.readingsContent.push({ nodeId, registeredIn: new Date().toISOString() });
    }
    const nodeProgress = p.nodes.find((item) => item.nodeId === nodeId);
    if (nodeProgress) nodeProgress.status = 'completed';
    else p.nodes.push({ nodeId, status: 'completed' });
    this.saveProgress(studentId, p);
    if (studentId === 'stu-01') this.subjectProgress.next(structuredClone(p));
    return of(structuredClone(p));
  }

  getStudents(_courseCohortId: string): Observable<Student[]> {
    return of(structuredClone(this.students));
  }

  private section(sectionId: string): Section | undefined {
    return this.roadmap.sections.find((u) => u.id === sectionId);
  }

  /**
   * Keeps only the fields that correspond to the type: any challenge (theoretical, practical or
   * boss) carries difficulty and a `challengeId` (stub — in production the Challenge
   * Engine references it, T03); 'milestone' and 'theory' do not, because they are not evaluated. 'theory' instead carries
   * `resourceUrl`/`resourceType` (external link to the material). The description is free for
   * any type — if the teacher leaves it empty, the student's map uses
   * `defaultDescription()`.
   */
  private normalize(dto: NewActivity, previous?: Activity): Omit<Activity, 'id' | 'positionX' | 'positionY'> {
    const isTheory = dto.type === 'theory';
    const isChallenge = dto.type !== 'milestone' && !isTheory;
    return {
      name: dto.name.trim(),
      type: dto.type,
      isMandatory: dto.isMandatory,
      allowedRetries: isChallenge ? Math.max(0, Math.min(3, dto.allowedRetries)) : 0,
      challengeId: isChallenge ? (previous?.challengeId ?? `desafio-ext-${Date.now().toString(36)}`) : undefined,
      description: dto.description?.trim() || undefined,
      difficulty: isChallenge ? (dto.difficulty ?? 'BASIC') : undefined,
      resourceUrl: isTheory ? dto.resourceUrl?.trim() || undefined : undefined,
      resourceType: isTheory ? (dto.resourceType ?? 'pdf') : undefined,
    };
  }

  private node(activityId: string): Activity | undefined {
    for (const u of this.roadmap.sections) {
      const a = u.activities.find((x) => x.id === activityId);
      if (a) return a;
    }
    return undefined;
  }

  /**
   * Would connecting origin→destination close a cycle? Yes, if destination can already reach origin
   * through the existing connections (DFS) — preventive feedback in the front before the backend's
   * 400 (`DetectorCiclos`), see the graphic editor prompt.
   */
  private wouldCreateCycle(originId: string, destinationId: string): boolean {
    const visited = new Set<string>();
    const stack = [destinationId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === originId) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const c of this.roadmap.connections) {
        if (c.nodeOriginId === current) stack.push(c.nodeDestinationId);
      }
    }
    return false;
  }

  private load(): Roadmap {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return this.migrate(JSON.parse(raw) as Roadmap);
    } catch {
      /* localStorage unavailable or corrupt — fall back to the seed */
    }
    const seed = roadmapSeed();
    this.persist(seed);
    return seed;
  }

  /**
   * Compatibility with roadmaps saved before this editor: without `connections` and with
   * nodes without `positionX`/`positionY`. Assigns them the default grid and persists, so the
   * migration runs only once (checklist: "old nodes → non-overlapping default position").
   */
  private migrate(rm: Roadmap): Roadmap {
    rm.connections ??= [];
    let change = false;
    for (const u of rm.sections) {
      u.activities.forEach((a, i) => {
        if (typeof a.positionX !== 'number' || typeof a.positionY !== 'number') {
          Object.assign(a, positionDefault(i));
          change = true;
        }
      });
    }
    if (change) this.persist(rm);
    return rm;
  }

  private loadProgress(studentId: string): Progress {
    try {
      const raw = localStorage.getItem(`${PROGRESS_LS_KEY}-${studentId}`);
      if (raw) {
        const progress = JSON.parse(raw) as Progress;
        progress.readingsContent ??= [];
        return progress;
      }
    } catch {
      /* ignore */
    }
    const progress = seedProgress(studentId);
    progress.readingsContent ??= [];
    return progress;
  }

  private saveProgress(studentId: string, p: Progress): void {
    try {
      localStorage.setItem(`${PROGRESS_LS_KEY}-${studentId}`, JSON.stringify(p));
    } catch {
      /* incognito mode / storage full */
    }
  }

  private save(): void {
    this.persist(this.roadmap);
  }

  private persist(rm: Roadmap): void {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(rm));
    } catch {
      /* incognito mode / storage full — the mock keeps working in memory */
    }
  }
}
