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
      badgeId: 'badge-perfect-section',
      code: 'badge_perfect_section',
      name: 'Sección perfecta',
      description: 'Completaste una sección entera sin perder vidas.',
      type: 'CROSS_CUTTING',
      origin: 'SYSTEM',
      pendingIcon: false,
    },
    {
      badgeId: 'badge-first-try',
      code: 'badge_first_try',
      name: 'A la primera',
      description: 'Superaste un nodo sin usar reintentos.',
      type: 'CROSS_CUTTING',
      origin: 'SYSTEM',
      pendingIcon: false,
    },
    {
      badgeId: 'badge-second-chance',
      code: 'badge_second_chance',
      name: 'Segunda oportunidad',
      description: 'Recuperaste una vida perdida.',
      type: 'CROSS_CUTTING',
      origin: 'SYSTEM',
      pendingIcon: true,
    },
    {
      badgeId: 'badge-milestone-xp-bronze',
      code: 'badge_milestone_xp_bronze',
      name: 'Hito de XP · Bronce',
      description: 'Alcanzaste el primer umbral de XP del curso.',
      type: 'CROSS_CUTTING',
      origin: 'SYSTEM',
      pendingIcon: false,
    },
    {
      badgeId: 'badge-milestone-xp-silver',
      code: 'badge_milestone_xp_silver',
      name: 'Hito de XP · Plata',
      description: 'Alcanzaste el segundo umbral de XP del curso.',
      type: 'CROSS_CUTTING',
      origin: 'SYSTEM',
      pendingIcon: false,
    },
    {
      badgeId: 'badge-milestone-xp-gold',
      code: 'badge_milestone_xp_gold',
      name: 'Hito de XP · Oro',
      description: 'Alcanzaste el tercer umbral de XP del curso.',
      type: 'CROSS_CUTTING',
      origin: 'SYSTEM',
      pendingIcon: false,
    },
    {
      badgeId: 'badge-level-up',
      code: 'badge_level_up',
      name: 'Subiste de nivel',
      description: 'Llegaste a un nuevo nivel.',
      type: 'CROSS_CUTTING',
      origin: 'SYSTEM',
      pendingIcon: true,
    },
    {
      badgeId: 'badge-elite-zone',
      code: 'badge_elite_zone',
      name: 'Zona de élite',
      description: 'Entraste a la zona P90 del ranking de la cohorte.',
      type: 'CROSS_CUTTING',
      origin: 'SYSTEM',
      pendingIcon: false,
    },
    {
      badgeId: 'badge-first-steps',
      code: 'badge_first_steps',
      name: 'Primeros pasos',
      description: 'Completaste tu primer nodo obligatorio.',
      type: 'CROSS_CUTTING',
      origin: 'SYSTEM',
      pendingIcon: false,
    },
    {
      badgeId: 'badge-explorer',
      code: 'badge_explorer',
      name: 'Explorador',
      description: 'Completaste un nodo opcional.',
      type: 'CROSS_CUTTING',
      origin: 'SYSTEM',
      pendingIcon: true,
    },
    {
      badgeId: 'badge-marathon',
      code: 'badge_marathon',
      name: 'Maratón',
      description: 'Completaste una sección entera en un solo día.',
      type: 'CROSS_CUTTING',
      origin: 'SYSTEM',
      pendingIcon: true,
    },
    {
      badgeId: 'badge-pioneer',
      code: 'badge_pioneer',
      name: 'Pionero',
      description: 'Fuiste el primero de la cohorte en completar un nodo.',
      type: 'CROSS_CUTTING',
      origin: 'SYSTEM',
      pendingIcon: false,
    },
    {
      badgeId: 'badge-boss',
      code: 'badge_boss',
      name: 'Boss',
      description: 'Hito especial asignado por el profesor a un nodo puntual.',
      type: 'PER_NODE',
      origin: 'SYSTEM',
      pendingIcon: false,
    },
    {
      badgeId: 'badge-event',
      code: 'badge_event',
      name: 'Insignia de evento',
      description: 'Desafío puntual, como un hackathon interno.',
      type: 'PER_NODE',
      origin: 'SYSTEM',
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
