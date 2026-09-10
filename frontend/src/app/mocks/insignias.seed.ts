import { InsigniaCatalogo, InsigniaOtorgada } from '../core/data/insignias.models';
import { cohorteMock } from './ranking.seed';

/**
 * Las 14 insignias del catálogo (pixel-art-arcade-icons skill, references/pixel-grids.md):
 * 12 transversales + 2 por nodo. 10 tienen ícono terminado, 4 están marcadas "rehacer" en
 * la skill (`iconoPendiente: true`) — se muestran igual, con el ícono provisorio.
 */
export function catalogoInsigniasSeed(): InsigniaCatalogo[] {
  return [
    {
      insigniaId: 'ins-seccion-perfecta',
      codigo: 'badge_seccion_perfecta',
      nombre: 'Sección perfecta',
      descripcion: 'Completaste una sección entera sin perder vidas.',
      tipo: 'TRANSVERSAL',
      origen: 'SISTEMA',
      iconoPendiente: false,
    },
    {
      insigniaId: 'ins-a-la-primera',
      codigo: 'badge_a_la_primera',
      nombre: 'A la primera',
      descripcion: 'Superaste un nodo sin usar reintentos.',
      tipo: 'TRANSVERSAL',
      origen: 'SISTEMA',
      iconoPendiente: false,
    },
    {
      insigniaId: 'ins-segunda-oportunidad',
      codigo: 'badge_segunda_oportunidad',
      nombre: 'Segunda oportunidad',
      descripcion: 'Recuperaste una vida perdida.',
      tipo: 'TRANSVERSAL',
      origen: 'SISTEMA',
      iconoPendiente: true,
    },
    {
      insigniaId: 'ins-hito-xp-bronce',
      codigo: 'badge_hito_xp_bronce',
      nombre: 'Hito de XP · Bronce',
      descripcion: 'Alcanzaste el primer umbral de XP del curso.',
      tipo: 'TRANSVERSAL',
      origen: 'SISTEMA',
      iconoPendiente: false,
    },
    {
      insigniaId: 'ins-hito-xp-plata',
      codigo: 'badge_hito_xp_plata',
      nombre: 'Hito de XP · Plata',
      descripcion: 'Alcanzaste el segundo umbral de XP del curso.',
      tipo: 'TRANSVERSAL',
      origen: 'SISTEMA',
      iconoPendiente: false,
    },
    {
      insigniaId: 'ins-hito-xp-oro',
      codigo: 'badge_hito_xp_oro',
      nombre: 'Hito de XP · Oro',
      descripcion: 'Alcanzaste el tercer umbral de XP del curso.',
      tipo: 'TRANSVERSAL',
      origen: 'SISTEMA',
      iconoPendiente: false,
    },
    {
      insigniaId: 'ins-subiste-de-nivel',
      codigo: 'badge_subiste_de_nivel',
      nombre: 'Subiste de nivel',
      descripcion: 'Llegaste a un nuevo nivel.',
      tipo: 'TRANSVERSAL',
      origen: 'SISTEMA',
      iconoPendiente: true,
    },
    {
      insigniaId: 'ins-zona-elite',
      codigo: 'badge_zona_elite',
      nombre: 'Zona de élite',
      descripcion: 'Entraste a la zona P90 del ranking de la cohorte.',
      tipo: 'TRANSVERSAL',
      origen: 'SISTEMA',
      iconoPendiente: false,
    },
    {
      insigniaId: 'ins-primeros-pasos',
      codigo: 'badge_primeros_pasos',
      nombre: 'Primeros pasos',
      descripcion: 'Completaste tu primer nodo obligatorio.',
      tipo: 'TRANSVERSAL',
      origen: 'SISTEMA',
      iconoPendiente: false,
    },
    {
      insigniaId: 'ins-explorador',
      codigo: 'badge_explorador',
      nombre: 'Explorador',
      descripcion: 'Completaste un nodo opcional.',
      tipo: 'TRANSVERSAL',
      origen: 'SISTEMA',
      iconoPendiente: true,
    },
    {
      insigniaId: 'ins-maraton',
      codigo: 'badge_maraton',
      nombre: 'Maratón',
      descripcion: 'Completaste una sección entera en un solo día.',
      tipo: 'TRANSVERSAL',
      origen: 'SISTEMA',
      iconoPendiente: true,
    },
    {
      insigniaId: 'ins-pionero',
      codigo: 'badge_pionero',
      nombre: 'Pionero',
      descripcion: 'Fuiste el primero de la cohorte en completar un nodo.',
      tipo: 'TRANSVERSAL',
      origen: 'SISTEMA',
      iconoPendiente: false,
    },
    {
      insigniaId: 'ins-boss',
      codigo: 'badge_boss',
      nombre: 'Boss',
      descripcion: 'Hito especial asignado por el profesor a un nodo puntual.',
      tipo: 'POR_NODO',
      origen: 'SISTEMA',
      iconoPendiente: false,
    },
    {
      insigniaId: 'ins-evento',
      codigo: 'badge_evento',
      nombre: 'Insignia de evento',
      descripcion: 'Desafío puntual, como un hackathon interno.',
      tipo: 'POR_NODO',
      origen: 'SISTEMA',
      iconoPendiente: false,
    },
  ];
}

function hash(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Insignias ganadas por un alumno. No hay endpoint real todavía (ver `InsigniasDataPort`),
 * así que se deriva de `cohorteMock()`: usa la cantidad que ya tiene ese alumno en
 * `FilaRanking.insignias` (para no mostrar un número distinto en ranking vs. acá) y elige
 * un subconjunto estable del catálogo con un hash simple — mismo alumno, mismo resultado
 * siempre, sin random real.
 */
export function insigniasGanadasSeed(alumnoId: string): InsigniaOtorgada[] {
  const fila = cohorteMock().find((f) => f.alumnoId === alumnoId);
  const catalogo = catalogoInsigniasSeed();
  const cantidad = Math.min(fila?.insignias ?? 0, catalogo.length);

  const ordenado = [...catalogo].sort(
    (a, b) => hash(alumnoId + a.codigo) - hash(alumnoId + b.codigo),
  );

  return ordenado.slice(0, cantidad).map((insignia, i) => ({
    insigniaId: insignia.insigniaId,
    otorgadaEn: new Date(2026, 2, 1 + ((hash(alumnoId + insignia.codigo) + i) % 60)).toISOString(),
  }));
}
