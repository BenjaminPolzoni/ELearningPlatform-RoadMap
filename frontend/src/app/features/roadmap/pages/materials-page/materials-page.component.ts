import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Theory material of the course (Temple node of the 3D world).
 *
 * Static mock Phase 1: the 3D temple sends `openMaterials` via postMessage and this
 * route shows sample sections with sample materials. When the other groups
 * expose their content service, this component will read from there
 * (see technical debt) — the route and the `openMaterials` contract are already fixed.
 */
interface SectionMaterial {
  title: string;
  icon: string;
  description: string;
  materials: { name: string; type: 'PDF' | 'Video' | 'PPT'; detail: string }[];
}

const EXAMPLE_SECTIONS: SectionMaterial[] = [
  {
    title: 'Fundamentos',
    icon: '📘',
    description: 'Conceptos base para arrancar cada unidad.',
    materials: [
      { name: 'Introducción a la materia (ejemplo)', type: 'PDF', detail: '12 páginas · lectura inicial' },
      { name: 'Video: cómo usar la plataforma (ejemplo)', type: 'Video', detail: '8 min · recorrido guiado' },
    ],
  },
  {
    title: 'Profundización',
    icon: '📗',
    description: 'Teoría ampliada con ejemplos resueltos.',
    materials: [
      { name: 'Guía de ejercicios resueltos (ejemplo)', type: 'PDF', detail: '20 páginas · con soluciones' },
      { name: 'Presentación de la unidad (ejemplo)', type: 'PPT', detail: '32 diapositivas' },
    ],
  },
  {
    title: 'Repaso para el Boss',
    icon: '📕',
    description: 'Resumen final antes del desafío de cierre.',
    materials: [
      { name: 'Resumen ejecutivo (ejemplo)', type: 'PDF', detail: '4 páginas · machete permitido' },
    ],
  },
];

@Component({
  selector: 'app-materials-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="materials">
      <nav class="materials-nav">
        <span class="materials-title">📜 MATERIAL TEÓRICO</span>
        <a routerLink="/roadmap/student" class="btn-back">← Volver al roadmap</a>
      </nav>
      <main class="materials-body">
        @for (s of sections; track s.title) {
          <section class="section">
            <h2>{{ s.icon }} {{ s.title }}</h2>
            <p class="section-desc">{{ s.description }}</p>
            <ul>
              @for (m of s.materials; track m.name) {
                <li>
                  <span class="badge">{{ m.type }}</span>
                  <div>
                    <strong>{{ m.name }}</strong>
                    <small>{{ m.detail }}</small>
                  </div>
                </li>
              }
            </ul>
          </section>
        }
        <p class="note">
          Contenido de ejemplo — acá van los archivos y PDFs reales cuando se conecte el servicio de contenidos.
        </p>
      </main>
    </div>
  `,
  styles: `
    .materials {
      min-height: 100vh;
      background: #1c1e2b;
      color: #fff;
    }
    .materials-nav {
      position: sticky;
      top: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.7rem 1rem;
      background: rgba(10, 10, 18, 0.9);
      border-bottom: 2px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(4px);
    }
    .materials-title {
      font-size: 0.8rem;
      letter-spacing: 0.15em;
    }
    .btn-back {
      padding: 0.4rem 0.8rem;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 0.4rem;
      background: rgba(30, 30, 45, 0.8);
      color: #fff;
      font-size: 0.75rem;
      text-decoration: none;
    }
    .btn-back:hover {
      background: rgba(30, 30, 45, 1);
    }
    .materials-body {
      max-width: 48rem;
      margin: 0 auto;
      padding: 1.5rem 1rem 3rem;
      display: flex;
      flex-direction: column;
      gap: 1.2rem;
    }
    .section {
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.6rem;
      padding: 1rem 1.2rem;
      background: rgba(0, 0, 0, 0.3);
    }
    .section h2 {
      margin: 0 0 0.2rem;
      font-size: 1.05rem;
    }
    .section-desc {
      margin: 0 0 0.8rem;
      font-size: 0.8rem;
      opacity: 0.7;
    }
    .section ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .section li {
      display: flex;
      gap: 0.7rem;
      align-items: center;
    }
    .section li div {
      display: flex;
      flex-direction: column;
    }
    .section li small {
      opacity: 0.6;
      font-size: 0.72rem;
    }
    .badge {
      font-size: 0.65rem;
      padding: 0.15rem 0.45rem;
      border-radius: 0.3rem;
      background: #7c3aed;
      white-space: nowrap;
    }
    .note {
      font-size: 0.75rem;
      opacity: 0.55;
      text-align: center;
    }
  `,
})
export class MaterialsPageComponent {
  protected readonly sections = EXAMPLE_SECTIONS;
}
