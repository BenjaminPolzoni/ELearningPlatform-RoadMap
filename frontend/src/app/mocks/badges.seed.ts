import { BadgeCatalog, GrantedBadge } from '../core/data/badges.models';
import { cohortMock } from './ranking.seed';

/**
 * The 14 badges of the catalog (pixel-art-arcade-icons skill, references/pixel-grids.md):
 * 12 cross-cutting + 2 per node. 10 have a finished icon, 4 are marked "redo" in
 * the skill (`pendingIcon: true`) — they are shown anyway, with the provisional icon.
 */
export function catalogBadgesSeed(): BadgeCatalog[] {
  return [
    {
      badgeId: 'ins-seccion-perfecta',
      code: 'badge_seccion_perfecta',
      name: 'Sección perfecta',
      description: 'Completaste una sección entera sin perder vidas.',
      type: 'TRANSVERSAL',
      origin: 'SISTEMA',
      pendingIcon: false,
    },
    {
      badgeId: 'ins-a-la-primera',
      code: 'badge_a_la_primera',
      name: 'A la primera',
      description: 'Superaste un nodo sin usar reintentos.',
      type: 'TRANSVERSAL',
      origin: 'SISTEMA',
      pendingIcon: false,
    },
    {
      badgeId: 'ins-segunda-oportunidad',
      code: 'badge_segunda_oportunidad',
      name: 'Segunda oportunidad',
      description: 'Recuperaste una vida perdida.',
      type: 'TRANSVERSAL',
      origin: 'SISTEMA',
      pendingIcon: true,
    },
    {
      badgeId: 'ins-hito-xp-bronce',
      code: 'badge_hito_xp_bronce',
      name: 'Hito de XP · Bronce',
      description: 'Alcanzaste el primer umbral de XP del curso.',
      type: 'TRANSVERSAL',
      origin: 'SISTEMA',
      pendingIcon: false,
    },
    {
      badgeId: 'ins-hito-xp-plata',
      code: 'badge_hito_xp_plata',
      name: 'Hito de XP · Plata',
      description: 'Alcanzaste el segundo umbral de XP del curso.',
      type: 'TRANSVERSAL',
      origin: 'SISTEMA',
      pendingIcon: false,
    },
    {
      badgeId: 'ins-hito-xp-oro',
      code: 'badge_hito_xp_oro',
      name: 'Hito de XP · Oro',
      description: 'Alcanzaste el tercer umbral de XP del curso.',
      type: 'TRANSVERSAL',
      origin: 'SISTEMA',
      pendingIcon: false,
    },
    {
      badgeId: 'ins-subiste-de-nivel',
      code: 'badge_subiste_de_nivel',
      name: 'Subiste de nivel',
      description: 'Llegaste a un nuevo nivel.',
      type: 'TRANSVERSAL',
      origin: 'SISTEMA',
      pendingIcon: true,
    },
    {
      badgeId: 'ins-zona-elite',
      code: 'badge_zona_elite',
      name: 'Zona de élite',
      description: 'Entraste a la zona P90 del ranking de la cohorte.',
      type: 'TRANSVERSAL',
      origin: 'SISTEMA',
      pendingIcon: false,
    },
    {
      badgeId: 'ins-primeros-pasos',
      code: 'badge_primeros_pasos',
      name: 'Primeros pasos',
      description: 'Completaste tu primer nodo obligatorio.',
      type: 'TRANSVERSAL',
      origin: 'SISTEMA',
      pendingIcon: false,
    },
    {
      badgeId: 'ins-explorador',
      code: 'badge_explorador',
      name: 'Explorador',
      description: 'Completaste un nodo opcional.',
      type: 'TRANSVERSAL',
      origin: 'SISTEMA',
      pendingIcon: true,
    },
    {
      badgeId: 'ins-maraton',
      code: 'badge_maraton',
      name: 'Maratón',
      description: 'Completaste una sección entera en un solo día.',
      type: 'TRANSVERSAL',
      origin: 'SISTEMA',
      pendingIcon: true,
    },
    {
      badgeId: 'ins-pionero',
      code: 'badge_pionero',
      name: 'Pionero',
      description: 'Fuiste el primero de la cohorte en completar un nodo.',
      type: 'TRANSVERSAL',
      origin: 'SISTEMA',
      pendingIcon: false,
    },
    {
      badgeId: 'ins-boss',
      code: 'badge_boss',
      name: 'Boss',
      description: 'Hito especial asignado por el profesor a un nodo puntual.',
      type: 'POR_NODO',
      origin: 'SISTEMA',
      pendingIcon: false,
    },
    {
      badgeId: 'ins-evento',
      code: 'badge_evento',
      name: 'Insignia de evento',
      description: 'Desafío puntual, como un hackathon interno.',
      type: 'POR_NODO',
      origin: 'SISTEMA',
      pendingIcon: false,
    },
  ];
}

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Badges earned by a student. There is no real endpoint yet (see `BadgesDataPort`),
 * so it is derived from `cohortMock()`: it uses the count that student already has in
 * `RankingRow.badges` (so as not to show a different number in ranking vs. here) and picks
 * a stable subset of the catalog with a simple hash — same student, same result
 * always, no real random.
 */
export function earnedBadgesSeed(studentId: string): GrantedBadge[] {
  const row = cohortMock().find((f) => f.studentId === studentId);
  const catalog = catalogBadgesSeed();
  const count = Math.min(row?.badges ?? 0, catalog.length);

  const sorted = [...catalog].sort(
    (a, b) => hash(studentId + a.code) - hash(studentId + b.code),
  );

  return sorted.slice(0, count).map((badge, i) => ({
    badgeId: badge.badgeId,
    grantedIn: new Date(2026, 2, 1 + ((hash(studentId + badge.code) + i) % 60)).toISOString(),
  }));
}
