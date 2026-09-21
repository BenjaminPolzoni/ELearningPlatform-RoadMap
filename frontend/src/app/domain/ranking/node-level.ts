// "Lv X" del ranking = NODO actual del alumno en el mapa de progreso del curso.
// No es `floor(xp / n)`: la XP se acumula por los desafíos dentro de cada nodo, y el
// nivel mostrado es el nodo sobre el que el alumno está parado (RF-NIV-05: el nivel es
// un rótulo cosmético; el ranking ordena por XP real).

import { Progreso } from '../../core/data/roadmap.models';

/**
 * Nodo actual = cantidad de nodos ya completados + 1, tope en el total de nodos del curso.
 * `totalNodos` se pasa aparte porque `Progreso.nodos` solo trae los nodos con estado
 * conocido para ese alumno; si no se conoce, cae en la longitud de `progreso.nodos`.
 */
export function nivelNodo(progreso: Progreso, totalNodos = progreso.nodos.length): number {
  const completados = progreso.nodos.filter((n) => n.estado === 'completado').length;
  return Math.min(Math.max(1, completados + 1), Math.max(1, totalNodos));
}
