import { TipoRecursoTeoria } from '../../core/data/roadmap.models';

/**
 * Convierte el link que pegó el profesor (YouTube, Google Drive, OneDrive, un archivo
 * directo, etc.) en una URL embebible en <iframe>. El proyecto no tiene backend de subida
 * de archivos, así que el "contenido teórico" siempre es un link externo — esto es lo
 * único que hace falta para poder mostrarlo dentro del mapa en vez de mandar al alumno a
 * otra pestaña. Usado por unidad-mapa.ts (mapa 2D) y mundo-3d.ts (overlay del mundo 3D).
 */
export function toEmbedUrl(tipo: TipoRecursoTeoria, url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  if (tipo === 'video') {
    const youtube = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
    if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
    const vimeo = trimmed.match(/vimeo\.com\/(\d+)/);
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
    return trimmed;
  }

  if (tipo === 'pdf') {
    // Un link "ver" de Google Drive no se puede embeber en <iframe>; "preview" sí.
    if (trimmed.includes('drive.google.com') && trimmed.includes('/view')) {
      return trimmed.replace('/view', '/preview');
    }
    return trimmed;
  }

  // 'ppt': el visor público de Office embebe PowerPoint por URL — solo funciona si el
  // link es accesible públicamente; para links privados el alumno usa el botón
  // "Abrir en pestaña nueva" que siempre acompaña al iframe.
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(trimmed)}`;
}
