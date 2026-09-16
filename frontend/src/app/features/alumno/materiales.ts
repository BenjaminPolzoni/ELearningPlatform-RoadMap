import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Material teórico del curso (nodo Templo del mundo 3D).
 *
 * Mock estático Fase 1: el templo 3D manda `openMateriales` por postMessage y esta
 * ruta muestra secciones de ejemplo con materiales de muestra. Cuando los otros
 * grupos expongan su servicio de contenidos, este componente pasa a leer de ahí
 * (ver deuda técnica) — la ruta y el contrato `openMateriales` ya quedan fijos.
 */
interface SeccionMaterial {
  titulo: string;
  icono: string;
  descripcion: string;
  materiales: { nombre: string; tipo: 'PDF' | 'Video' | 'PPT'; detalle: string }[];
}

const SECCIONES_EJEMPLO: SeccionMaterial[] = [
  {
    titulo: 'Fundamentos',
    icono: '📘',
    descripcion: 'Conceptos base para arrancar cada unidad.',
    materiales: [
      { nombre: 'Introducción a la materia (ejemplo)', tipo: 'PDF', detalle: '12 páginas · lectura inicial' },
      { nombre: 'Video: cómo usar la plataforma (ejemplo)', tipo: 'Video', detalle: '8 min · recorrido guiado' },
    ],
  },
  {
    titulo: 'Profundización',
    icono: '📗',
    descripcion: 'Teoría ampliada con ejemplos resueltos.',
    materiales: [
      { nombre: 'Guía de ejercicios resueltos (ejemplo)', tipo: 'PDF', detalle: '20 páginas · con soluciones' },
      { nombre: 'Presentación de la unidad (ejemplo)', tipo: 'PPT', detalle: '32 diapositivas' },
    ],
  },
  {
    titulo: 'Repaso para el Boss',
    icono: '📕',
    descripcion: 'Resumen final antes del desafío de cierre.',
    materiales: [
      { nombre: 'Resumen ejecutivo (ejemplo)', tipo: 'PDF', detalle: '4 páginas · machete permitido' },
    ],
  },
];

@Component({
  selector: 'app-materiales',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="materiales">
      <nav class="materiales-nav">
        <span class="materiales-title">📜 MATERIAL TEÓRICO</span>
        <a routerLink="/alumno" class="btn-volver">← Volver al roadmap</a>
      </nav>
      <main class="materiales-body">
        @for (s of secciones; track s.titulo) {
          <section class="seccion">
            <h2>{{ s.icono }} {{ s.titulo }}</h2>
            <p class="seccion-desc">{{ s.descripcion }}</p>
            <ul>
              @for (m of s.materiales; track m.nombre) {
                <li>
                  <span class="badge">{{ m.tipo }}</span>
                  <div>
                    <strong>{{ m.nombre }}</strong>
                    <small>{{ m.detalle }}</small>
                  </div>
                </li>
              }
            </ul>
          </section>
        }
        <p class="nota">
          Contenido de ejemplo — acá van los archivos y PDFs reales cuando se conecte el servicio de contenidos.
        </p>
      </main>
    </div>
  `,
  styles: `
    .materiales {
      min-height: 100vh;
      background: #1c1e2b;
      color: #fff;
    }
    .materiales-nav {
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
    .materiales-title {
      font-size: 0.8rem;
      letter-spacing: 0.15em;
    }
    .btn-volver {
      padding: 0.4rem 0.8rem;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 0.4rem;
      background: rgba(30, 30, 45, 0.8);
      color: #fff;
      font-size: 0.75rem;
      text-decoration: none;
    }
    .btn-volver:hover {
      background: rgba(30, 30, 45, 1);
    }
    .materiales-body {
      max-width: 48rem;
      margin: 0 auto;
      padding: 1.5rem 1rem 3rem;
      display: flex;
      flex-direction: column;
      gap: 1.2rem;
    }
    .seccion {
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.6rem;
      padding: 1rem 1.2rem;
      background: rgba(0, 0, 0, 0.3);
    }
    .seccion h2 {
      margin: 0 0 0.2rem;
      font-size: 1.05rem;
    }
    .seccion-desc {
      margin: 0 0 0.8rem;
      font-size: 0.8rem;
      opacity: 0.7;
    }
    .seccion ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .seccion li {
      display: flex;
      gap: 0.7rem;
      align-items: center;
    }
    .seccion li div {
      display: flex;
      flex-direction: column;
    }
    .seccion li small {
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
    .nota {
      font-size: 0.75rem;
      opacity: 0.55;
      text-align: center;
    }
  `,
})
export class Materiales {
  protected readonly secciones = SECCIONES_EJEMPLO;
}
