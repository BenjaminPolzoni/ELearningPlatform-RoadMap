/**
 * Librería visual compartida (05-design-system.md §4).
 *
 * Importación única para cualquier grupo de la plataforma:
 *
 *   import { UiButton, UiTabs, type UiTab } from '../shared/ui';
 *
 * O desde la raíz de la app:
 *
 *   import { UiButton } from './shared/ui';
 */
export { UiButton } from './button';
export type { UiButtonSize, UiButtonVariant } from './button';
export { UiCard } from './card';
export { UiBadge } from './badge';
export type { UiBadgeTone } from './badge';
export { UiInput } from './input';
export { UiTextarea } from './textarea';
export { UiSelect } from './select';
export { UiModal } from './modal';
export { UiProgress } from './progress';
export type { UiProgressTone } from './progress';
export { UiTabs } from './tabs';
export type { UiTab } from './tabs';
export { UiAlert } from './alert';
export type { UiAlertTone } from './alert';