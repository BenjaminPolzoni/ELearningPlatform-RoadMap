import type { Role } from '../data-access/session/auth-mock.service';
import type { BadgeOrigin } from '../data-access/badges/badges.models';
import type { Difficulty, NodeType } from '../data-access/roadmap/roadmap.models';
import type { AttachmentType } from '../data-access/educa/models';

/**
 * User-facing (Spanish) labels for the internal enum values. The values themselves are
 * English identifiers; this is the only place that maps them to what the user reads.
 */
export const ROLE_LABEL: Record<Role, string> = { STUDENT: 'STUDENT', TEACHER: 'TEACHER', ADMIN: 'ADMIN' };

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { BASIC: 'BASIC', MEDIUM: 'MEDIUM', ADVANCED: 'ADVANCED' };

export const NODE_TYPE_LABEL: Record<NodeType, string> = {
  theory: 'theory',
  'theoretical-challenge': 'theoretical-challenge',
  'practical-challenge': 'practical-challenge',
  boss: 'boss',
  milestone: 'milestone',
};

export const ATTACHMENT_TYPE_LABEL: Record<AttachmentType, string> = {
  document: 'document',
  video: 'video',
  link: 'link',
  image: 'image',
  exercise: 'exercise',
};

export const BADGE_ORIGIN_LABEL: Record<BadgeOrigin, string> = { SYSTEM: 'SYSTEM', TEACHER: 'TEACHER' };

export const ENTITY_KIND_LABEL: Record<string, string> = {
  subject: 'asignatura',
  section: 'unidad',
  module: 'módulo',
  attachment: 'anexo',
};
