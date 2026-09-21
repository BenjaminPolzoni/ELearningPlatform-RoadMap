// The ranking's "Lv X" = the student's CURRENT NODE on the course's progress map.
// It is not `floor(xp / n)`: XP accumulates through the challenges inside each node, and the
// level shown is the node the student is standing on (RF-NIV-05: the level is a
// cosmetic label; the ranking sorts by real XP).

import { Progress } from '../../data-access/roadmap/roadmap.models';

/**
 * Current node = number of already completed nodes + 1, capped at the course's total nodes.
 * `totalNodes` is passed separately because `Progress.nodes` only brings the nodes with a
 * known status for that student; if it is not known, it falls back to the length of `progress.nodes`.
 */
export function nodeLevel(progress: Progress, totalNodes = progress.nodes.length): number {
  const completed = progress.nodes.filter((n) => n.status === 'completed').length;
  return Math.min(Math.max(1, completed + 1), Math.max(1, totalNodes));
}
