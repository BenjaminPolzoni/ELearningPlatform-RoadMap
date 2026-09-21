import { ResourceTheoryType } from '../data-access/roadmap/roadmap.models';

/**
 * Converts the link pasted by the teacher (YouTube, Google Drive, OneDrive, a direct
 * file, etc.) into a URL embeddable in an <iframe>. The project has no file-upload
 * backend, so the "theory content" is always an external link — this is the
 * only thing needed to show it inside the map instead of sending the student to
 * another tab. Used by section-map.ts (2D map) and world-3d.ts (3D world overlay).
 */
export function toEmbedUrl(type: ResourceTheoryType, url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  if (type === 'video') {
    const youtube = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
    if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
    const vimeo = trimmed.match(/vimeo\.com\/(\d+)/);
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
    return trimmed;
  }

  if (type === 'pdf') {
    // A Google Drive "view" link cannot be embedded in an <iframe>; "preview" can.
    if (trimmed.includes('drive.google.com') && trimmed.includes('/view')) {
      return trimmed.replace('/view', '/preview');
    }
    return trimmed;
  }

  // 'ppt': the public Office viewer embeds PowerPoint by URL — it only works if the
  // link is publicly accessible; for private links the student uses the
  // "Open in new tab" button that always accompanies the iframe.
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(trimmed)}`;
}
