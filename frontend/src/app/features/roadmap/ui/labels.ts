import type { BadgeOrigin } from '../data-access/badges/badges.models';
import type { Difficulty } from '../data-access/roadmap/roadmap.models';
import type { AttachmentType } from '../data-access/educa/models';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { BASIC: 'BASIC', MEDIUM: 'MEDIUM', ADVANCED: 'ADVANCED' };

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
