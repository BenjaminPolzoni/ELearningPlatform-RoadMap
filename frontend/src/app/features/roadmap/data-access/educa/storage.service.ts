import { Injectable } from '@angular/core';
import type { Subject } from './models';

import { COURSE_SEED_ID } from '../mocks/seed';

const KEY = 'educa.subjects.v2';

function initialSeed(): Subject[] {
  const now = new Date().toISOString();
  return [
    {
      id: COURSE_SEED_ID,
      name: 'Introducción a la Programación',
      description: 'Curso fundamental de algoritmos, lógica y estructuras con desafíos gamificados.',
      creationDate: now,
      modificationDate: now,
      sections: [
        {
          id: 'u1-fundamentals',
          title: 'Fundamentos de Algoritmos',
          description: 'Variables, tipos de datos y operadores lógicos.',
          order: 0,
          color: '#f59e0b',
          biome: 'desert',
          modules: [
            {
              id: 'm1-variables',
              title: 'Variables y Constantes',
              description: 'Asignación de memoria y tipos primitivos.',
              order: 0,
              attachments: [
                {
                  id: 'a1-doc-types',
                  title: 'Guía de Tipos Primitivos',
                  type: 'document',
                  description: 'Conceptos teóricos sobre enteros, flotantes y booleanos.',
                  url: 'https://developer.mozilla.org',
                },
                {
                  id: 'a2-ex-variables',
                  title: 'Desafío: Declaración de Variables',
                  type: 'exercise',
                  description: 'Valida tu comprensión de declaración y ámbito de variables.',
                },
              ],
            },
            {
              id: 'm2-operators',
              title: 'Operadores y Expresiones',
              description: 'Aritmética y lógica booleana.',
              order: 1,
              attachments: [
                {
                  id: 'a3-ex-expressions',
                  title: 'Desafío: Evaluación de Expresiones',
                  type: 'exercise',
                  description: 'Resuelve las operaciones respetando la precedencia.',
                },
              ],
            },
          ],
        },
        {
          id: 'u2-control',
          title: 'Estructuras de Control',
          description: 'Condicionales if/else y bucles while/for.',
          order: 1,
          color: '#10b981',
          biome: 'meadow',
          modules: [
            {
              id: 'm3-conditionals',
              title: 'Bifurcaciones Condicionales',
              description: 'Toma de decisiones lógicas.',
              order: 0,
              attachments: [
                {
                  id: 'a4-vid-conditionals',
                  title: 'Video Explicativo: If/Else en Acción',
                  type: 'video',
                  description: 'Demostración práctica de bifurcaciones.',
                  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                },
                {
                  id: 'a5-ex-conditionals',
                  title: 'Desafío: Rutas Lógicas',
                  type: 'exercise',
                  description: 'Determina qué rama del código se ejecuta según la condición.',
                },
              ],
            },
            {
              id: 'm4-loops',
              title: 'Iteraciones y Bucles',
              description: 'Repetición controlada de instrucciones.',
              order: 1,
              attachments: [
                {
                  id: 'a6-ex-loops',
                  title: 'Desafío: Contador de Ciclos',
                  type: 'exercise',
                  description: 'Predice el número exacto de iteraciones.',
                },
              ],
            },
          ],
        },
        {
          id: 'u3-functions',
          title: 'Funciones y Modularización',
          description: 'Parámetros, retorno y reutilización de código.',
          order: 2,
          color: '#6366f1',
          biome: 'meadow',
          modules: [
            {
              id: 'm5-modularization',
              title: 'Diseño Modular',
              description: 'Descomposición en subproblemas.',
              order: 0,
              attachments: [
                {
                  id: 'a7-doc-functions',
                  title: 'Apunte: Funciones Puras e Impuras',
                  type: 'document',
                  description: 'Buenas prácticas en el paso de argumentos.',
                  url: 'https://developer.mozilla.org',
                },
                {
                  id: 'a8-ex-functions',
                  title: 'Desafío: Retorno de Valores',
                  type: 'exercise',
                  description: 'Identifica el output producido por la invocación.',
                },
              ],
            },
          ],
        },
        {
          id: 'u4-structures',
          title: 'Estructuras de Datos',
          description: 'Arreglos, listas y colecciones.',
          order: 3,
          color: '#06b6d4',
          biome: 'snow',
          modules: [
            {
              id: 'm6-arrays',
              title: 'Arreglos Unidimensionales',
              description: 'Indexación y recorrido de vectores.',
              order: 0,
              attachments: [
                {
                  id: 'a9-ex-arrays',
                  title: 'Desafío: Búsqueda en Arreglos',
                  type: 'exercise',
                  description: 'Encuentra el elemento deseado en el arreglo.',
                },
              ],
            },
          ],
        },
      ],
    },
  ];
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  list(): Subject[] {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        const seed = initialSeed();
        localStorage.setItem(KEY, JSON.stringify(seed));
        return seed;
      }
      const parsed = JSON.parse(raw) as Subject[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        const seed = initialSeed();
        localStorage.setItem(KEY, JSON.stringify(seed));
        return seed;
      }
      return parsed;
    } catch {
      return initialSeed();
    }
  }

  load(id: string): Subject | null {
    return this.list().find((a) => a.id === id) ?? null;
  }

  save(a: Subject): void {
    const all = this.list().filter((x) => x.id !== a.id);
    all.push({ ...a, modificationDate: new Date().toISOString() });
    try {
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {
      /* ignore */
    }
  }

  remove(id: string): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.list().filter((x) => x.id !== id)));
    } catch {
      /* ignore */
    }
  }
}
