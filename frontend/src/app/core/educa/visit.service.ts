import { Injectable } from '@angular/core';

interface Progress {
  v: string[]; // anexos finalizados (botón Finalizar)
  p: string[]; // desafíos de torre superados (moduloId)
}

function migrate(raw: string | null): Progress {
  if (!raw) return { v: [], p: [] };
  try {
    const j = JSON.parse(raw) as Progress | string[];
    if (Array.isArray(j)) return { v: j, p: [] };
    return { v: j.v ?? [], p: j.p ?? [] };
  } catch {
    return { v: [], p: [] };
  }
}

@Injectable({ providedIn: 'root' })
export class VisitService {
  private k = (aid: string): string => `educa.visitadas.${aid}`;

  private read(aid: string): Progress {
    try {
      return migrate(localStorage.getItem(this.k(aid)));
    } catch {
      return { v: [], p: [] };
    }
  }

  private write(aid: string, p: Progress): void {
    try {
      localStorage.setItem(this.k(aid), JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }

  list(aid: string): string[] {
    return this.read(aid).v;
  }

  mark(aid: string, id: string): string[] {
    const p = this.read(aid);
    if (!p.v.includes(id)) {
      p.v.push(id);
      this.write(aid, p);
    }
    return p.v;
  }

  passed(aid: string): string[] {
    return this.read(aid).p;
  }

  pass(aid: string, moduloId: string): string[] {
    const p = this.read(aid);
    if (!p.p.includes(moduloId)) {
      p.p.push(moduloId);
      this.write(aid, p);
    }
    return p.p;
  }
}
