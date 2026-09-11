// Fixture de la cohorte para el ranking (Fases 0-2). Se arma sobre `alumnosSeed()` para
// que los 12 alumnos, sus nombres y legajos sean LOS MISMOS que ve el resto de la app
// (02-modelo-de-datos.md §"El seed no es descartable: es el fixture con el que se prueba
// el ranking"). Números fijos y deterministas — el ranking no debe "bailar" entre cargas.
//
// AVATAR: mismo `AvatarConfig` que usa el resto de la plataforma (HUD, mapa, "Mi
// personaje"), no una imagen aparte. El alumno logueado ve su avatar real (AvatarService);
// el resto de la cohorte recibe una combinación determinística por alumno — nunca cambia
// entre cargas y nunca dos alumnos comparten exactamente el mismo look.

import { armarAvatar, AvatarConfig } from '../core/avatar/avatar.models';
import { FilaRanking } from '../core/data/ranking.models';
import { ordenarCohorte, percentilDe, zonaDe } from '../domain/ranking/ranking.reglas';
import { alumnosSeed } from './seed';

/** Alumno logueado en el mock (coincide con `features/alumno/mapa.ts`). */
export const ALUMNO_ACTUAL_ID = 'alu-01';

/** Combinación de avatar determinística por `seed` — mismo catálogo que el editor de avatar. */
export function avatarConfigMock(seed: string): AvatarConfig {
  // Un hash por campo: con 12 campos, repartir los 32 bits de un único hash a 3 bits por
  // campo ya no alcanza (los últimos campos saldrían siempre del mismo resto).
  const hash = (s: string): number => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  };
  return armarAvatar((campo, opciones) => opciones[hash(`${seed}:${campo}`) % opciones.length].id);
}

/**
 * Datos crudos por alumno (12 filas). Pensado para ejercitar las reglas:
 *  - alu-02 lidera limpio → candidato a promoción (RF-RNK-05).
 *  - alu-03 está en zona alta pero con una vida perdida → NO candidato.
 *  - alu-01 (el usuario logueado) va a mitad de tabla.
 *  - los últimos arrastran obligatorios sin cerrar → riesgo de regularidad (RF-RNK-06).
 */
interface Crudo {
  id: string;
  xpTotal: number;
  nivelNodo: number;
  insignias: number;
  vidas: number;
  monedas: number;
  vidasPerdidasHistorico: number;
  ejerciciosCompletados: number;
  obligatoriosAprobadosPct: number;
}

const CRUDOS: Crudo[] = [
  {
    id: 'alu-02',
    xpTotal: 4820,
    nivelNodo: 18,
    insignias: 9,
    vidas: 3,
    monedas: 5400,
    vidasPerdidasHistorico: 0,
    ejerciciosCompletados: 46,
    obligatoriosAprobadosPct: 100,
  },
  {
    id: 'alu-05',
    xpTotal: 4310,
    nivelNodo: 16,
    insignias: 7,
    vidas: 3,
    monedas: 4700,
    vidasPerdidasHistorico: 0,
    ejerciciosCompletados: 41,
    obligatoriosAprobadosPct: 100,
  },
  {
    id: 'alu-03',
    xpTotal: 4180,
    nivelNodo: 16,
    insignias: 8,
    vidas: 2,
    monedas: 4300,
    vidasPerdidasHistorico: 1,
    ejerciciosCompletados: 40,
    obligatoriosAprobadosPct: 95,
  },
  {
    id: 'alu-09',
    xpTotal: 3600,
    nivelNodo: 14,
    insignias: 6,
    vidas: 3,
    monedas: 3800,
    vidasPerdidasHistorico: 0,
    ejerciciosCompletados: 35,
    obligatoriosAprobadosPct: 92,
  },
  {
    id: 'alu-07',
    xpTotal: 3255,
    nivelNodo: 13,
    insignias: 5,
    vidas: 2,
    monedas: 3300,
    vidasPerdidasHistorico: 1,
    ejerciciosCompletados: 32,
    obligatoriosAprobadosPct: 88,
  },
  {
    id: 'alu-01',
    xpTotal: 2980,
    nivelNodo: 12,
    insignias: 5,
    vidas: 3,
    monedas: 3050,
    vidasPerdidasHistorico: 0,
    ejerciciosCompletados: 29,
    obligatoriosAprobadosPct: 84,
  },
  {
    id: 'alu-11',
    xpTotal: 2740,
    nivelNodo: 11,
    insignias: 4,
    vidas: 2,
    monedas: 2600,
    vidasPerdidasHistorico: 1,
    ejerciciosCompletados: 27,
    obligatoriosAprobadosPct: 80,
  },
  {
    id: 'alu-04',
    xpTotal: 2390,
    nivelNodo: 10,
    insignias: 4,
    vidas: 2,
    monedas: 2200,
    vidasPerdidasHistorico: 2,
    ejerciciosCompletados: 24,
    obligatoriosAprobadosPct: 72,
  },
  {
    id: 'alu-08',
    xpTotal: 2015,
    nivelNodo: 9,
    insignias: 3,
    vidas: 1,
    monedas: 1750,
    vidasPerdidasHistorico: 2,
    ejerciciosCompletados: 20,
    obligatoriosAprobadosPct: 65,
  },
  {
    id: 'alu-12',
    xpTotal: 1580,
    nivelNodo: 7,
    insignias: 2,
    vidas: 1,
    monedas: 1200,
    vidasPerdidasHistorico: 3,
    ejerciciosCompletados: 16,
    obligatoriosAprobadosPct: 55,
  },
  {
    id: 'alu-06',
    xpTotal: 1240,
    nivelNodo: 6,
    insignias: 2,
    vidas: 1,
    monedas: 900,
    vidasPerdidasHistorico: 3,
    ejerciciosCompletados: 12,
    obligatoriosAprobadosPct: 48,
  },
  {
    id: 'alu-10',
    xpTotal: 820,
    nivelNodo: 4,
    insignias: 1,
    vidas: 0,
    monedas: 400,
    vidasPerdidasHistorico: 3,
    ejerciciosCompletados: 8,
    obligatoriosAprobadosPct: 33,
  },
];

/**
 * Cohorte completa, YA ordenada y con `posicion` / `percentil` / `zona` resueltos por las
 * reglas de dominio. Es lo que el BFF entregaría consolidado; el adapter la recorta por rol.
 */
export function cohorteMock(): FilaRanking[] {
  const alumnos = new Map(alumnosSeed().map((a) => [a.id, a]));
  const total = CRUDOS.length;

  const sinPosicion: FilaRanking[] = CRUDOS.map((c) => {
    const a = alumnos.get(c.id)!;
    return {
      alumnoId: a.id,
      posicion: 0, // lo fija ordenarCohorte
      nombre: a.nombre,
      apellido: a.apellido,
      legajo: a.legajo,
      avatar: avatarConfigMock(a.id),
      xpTotal: c.xpTotal,
      nivelNodo: c.nivelNodo,
      percentil: 0,
      zona: 'ninguna',
      insignias: c.insignias,
      vidas: c.vidas,
      monedas: c.monedas,
      vidasPerdidasHistorico: c.vidasPerdidasHistorico,
      ejerciciosCompletados: c.ejerciciosCompletados,
      obligatoriosAprobadosPct: c.obligatoriosAprobadosPct,
    };
  });

  return ordenarCohorte(sinPosicion).map((fila) => ({
    ...fila,
    percentil: percentilDe(fila.posicion, total),
    zona: zonaDe(fila.posicion, total),
  }));
}
