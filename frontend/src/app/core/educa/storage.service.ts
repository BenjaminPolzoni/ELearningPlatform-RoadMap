import { Injectable } from '@angular/core';
import type { Asignatura } from './models';

import { CURSO_SEED_ID } from '../../mocks/seed';

const KEY = 'educa.asignaturas.v1';

function initialSeed(): Asignatura[] {
  const now = new Date().toISOString();
  return [
    {
      id: CURSO_SEED_ID,
      nombre: 'Introducción a la Programación',
      descripcion: 'Curso fundamental de algoritmos, lógica y estructuras con desafíos gamificados.',
      fechaCreacion: now,
      fechaModificacion: now,
      unidades: [
        {
          id: 'u1-fundamentos',
          titulo: 'Fundamentos de Algoritmos',
          descripcion: 'Variables, tipos de datos y operadores lógicos.',
          orden: 0,
          color: '#f59e0b',
          bioma: 'desierto',
          modulos: [
            {
              id: 'm1-variables',
              titulo: 'Variables y Constantes',
              descripcion: 'Asignación de memoria y tipos primitivos.',
              orden: 0,
              anexos: [
                {
                  id: 'a1-doc-tipos',
                  titulo: 'Guía de Tipos Primitivos',
                  tipo: 'documento',
                  descripcion: 'Conceptos teóricos sobre enteros, flotantes y booleanos.',
                  url: 'https://developer.mozilla.org',
                },
                {
                  id: 'a2-ej-variables',
                  titulo: 'Desafío: Declaración de Variables',
                  tipo: 'ejercicio',
                  descripcion: 'Valida tu comprensión de declaración y ámbito de variables.',
                },
              ],
            },
            {
              id: 'm2-operadores',
              titulo: 'Operadores y Expresiones',
              descripcion: 'Aritmética y lógica booleana.',
              orden: 1,
              anexos: [
                {
                  id: 'a3-ej-expresiones',
                  titulo: 'Desafío: Evaluación de Expresiones',
                  tipo: 'ejercicio',
                  descripcion: 'Resuelve las operaciones respetando la precedencia.',
                },
              ],
            },
          ],
        },
        {
          id: 'u2-control',
          titulo: 'Estructuras de Control',
          descripcion: 'Condicionales if/else y bucles while/for.',
          orden: 1,
          color: '#10b981',
          bioma: 'pradera',
          modulos: [
            {
              id: 'm3-condicionales',
              titulo: 'Bifurcaciones Condicionales',
              descripcion: 'Toma de decisiones lógicas.',
              orden: 0,
              anexos: [
                {
                  id: 'a4-vid-condicionales',
                  titulo: 'Video Explicativo: If/Else en Acción',
                  tipo: 'video',
                  descripcion: 'Demostración práctica de bifurcaciones.',
                  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                },
                {
                  id: 'a5-ej-condicionales',
                  titulo: 'Desafío: Rutas Lógicas',
                  tipo: 'ejercicio',
                  descripcion: 'Determina qué rama del código se ejecuta según la condición.',
                },
              ],
            },
            {
              id: 'm4-bucles',
              titulo: 'Iteraciones y Bucles',
              descripcion: 'Repetición controlada de instrucciones.',
              orden: 1,
              anexos: [
                {
                  id: 'a6-ej-bucles',
                  titulo: 'Desafío: Contador de Ciclos',
                  tipo: 'ejercicio',
                  descripcion: 'Predice el número exacto de iteraciones.',
                },
              ],
            },
          ],
        },
        {
          id: 'u3-funciones',
          titulo: 'Funciones y Modularización',
          descripcion: 'Parámetros, retorno y reutilización de código.',
          orden: 2,
          color: '#6366f1',
          bioma: 'pradera',
          modulos: [
            {
              id: 'm5-modularizacion',
              titulo: 'Diseño Modular',
              descripcion: 'Descomposición en subproblemas.',
              orden: 0,
              anexos: [
                {
                  id: 'a7-doc-funciones',
                  titulo: 'Apunte: Funciones Puras e Impuras',
                  tipo: 'documento',
                  descripcion: 'Buenas prácticas en el paso de argumentos.',
                  url: 'https://developer.mozilla.org',
                },
                {
                  id: 'a8-ej-funciones',
                  titulo: 'Desafío: Retorno de Valores',
                  tipo: 'ejercicio',
                  descripcion: 'Identifica el output producido por la invocación.',
                },
              ],
            },
          ],
        },
        {
          id: 'u4-estructuras',
          titulo: 'Estructuras de Datos',
          descripcion: 'Arreglos, listas y colecciones.',
          orden: 3,
          color: '#06b6d4',
          bioma: 'nieve',
          modulos: [
            {
              id: 'm6-arreglos',
              titulo: 'Arreglos Unidimensionales',
              descripcion: 'Indexación y recorrido de vectores.',
              orden: 0,
              anexos: [
                {
                  id: 'a9-ej-arreglos',
                  titulo: 'Desafío: Búsqueda en Arreglos',
                  tipo: 'ejercicio',
                  descripcion: 'Encuentra el elemento deseado en el arreglo.',
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
  list(): Asignatura[] {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        const seed = initialSeed();
        localStorage.setItem(KEY, JSON.stringify(seed));
        return seed;
      }
      const parsed = JSON.parse(raw) as Asignatura[];
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

  load(id: string): Asignatura | null {
    return this.list().find((a) => a.id === id) ?? null;
  }

  save(a: Asignatura): void {
    const all = this.list().filter((x) => x.id !== a.id);
    all.push({ ...a, fechaModificacion: new Date().toISOString() });
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
