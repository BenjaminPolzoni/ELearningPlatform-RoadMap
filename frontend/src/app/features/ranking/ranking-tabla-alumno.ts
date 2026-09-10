import { Component, computed, input, output } from '@angular/core';
import { FilaRanking, FilaRankingAnon, VistaRankingAlumno } from '../../core/data/ranking.models';
import { enRiesgoRegularidad, esCandidatoPromocion } from '../../domain/ranking/ranking.reglas';

type FilaLista = FilaRanking | FilaRankingAnon;

function esIdentificada(f: FilaLista): f is FilaRanking {
  return 'nombre' in f;
}

/**
 * Estado académico de la fila propia — lo único que el banner muestra. Solo hay banner
 * para PROMOCIÓN (RF-RNK-05) y RIESGO (RF-RNK-06); cualquier otra situación (incluido
 * estar en P90/P10 sin cumplir las condiciones) se considera "alumno regular" y no lleva
 * banner.
 */
type EstadoZona = 'promocion' | 'riesgo' | 'fuera' | 'inactivo';
type Tono = 'ok' | 'risk' | 'info';

const COPY: Record<EstadoZona, { tag: string; sub: string; tono: Tono }> = {
  promocion: {
    tag: 'ESTÁS EN ZONA DE PROMOCIÓN',
    sub: 'P90 · 0 vidas perdidas en el curso · 100 % de obligatorios (RF-RNK-05)',
    tono: 'ok',
  },
  riesgo: {
    tag: 'ESTÁS EN ZONA DE RIESGO',
    sub: 'P10 · obligatorios sin cerrar — tu regularidad está en juego (RF-RNK-06)',
    tono: 'risk',
  },
  fuera: {
    tag: 'SIN PUESTO',
    sub: 'No figurás en esta cohorte todavía',
    tono: 'info',
  },
  inactivo: {
    tag: 'PERCENTILES INACTIVOS',
    sub: 'La cohorte aún no llega a 10 inscriptos (RF-RNK-09)',
    tono: 'info',
  },
};

/**
 * Vista del ALUMNO (RF-RNK-03). Pantalla unificada: NO hay podio. Una sola lista con
 * scroll, toda anonimizada salvo la fila propia, donde el estado académico es el
 * protagonista:
 *  - PROMOCIÓN (verde) → fila en P90 que además tiene 0 vidas perdidas históricas y el
 *    100 % de los obligatorios aprobados (RF-RNK-05). Si está en P90 sin cumplir ambas,
 *    se muestra como alumno regular.
 *  - RIESGO (rojo) → fila en P10 que no superó todos los obligatorios (RF-RNK-06).
 * No decide privacidad: renderiza lo que el adapter ya recortó.
 */
@Component({
  selector: 'app-ranking-tabla-alumno',
  template: `
    <!-- ══ TU ESTADO ══ solo aparece si estás en PROMOCIÓN o en RIESGO ══ -->
    @if (vista().yo; as yo) {
      @if (copy(); as c) {
        <button type="button" class="rk-estado rk-estado--{{ c.tono }}" (click)="seleccionar.emit(yo)">
          <span class="rk-estado__pos">
            <span class="rk-estado__pos-num tabular">{{ pad(yo.posicion) }}</span>
            <span class="rk-estado__pos-tot">/ {{ vista().totalInscriptos }}</span>
          </span>
          <span class="rk-estado__body">
            <span class="rk-estado__tag">{{ c.tag }}</span>
            <span class="rk-estado__sub">{{ c.sub }}</span>
          </span>
          <span class="rk-estado__pctil">P{{ yo.percentil }}</span>
        </button>
      }
    } @else if (copy(); as c) {
      <div class="rk-estado rk-estado--info">
        <span class="rk-estado__body">
          <span class="rk-estado__tag">{{ c.tag }}</span>
          <span class="rk-estado__sub">{{ c.sub }}</span>
        </span>
      </div>
    }

    <!-- ══ Encabezado + cohorte completa (anónima salvo tu fila) ══ -->
    <div class="rk-head">
      <span style="text-align:center">POS</span><span>Estudiante</span>
      <span style="text-align:center">Pctil</span><span style="text-align:center">Nivel</span>
      <span style="text-align:right">XP</span>
    </div>

    @if (!vista().cortes) {
      <div class="rk-divider">
        <span class="rk-divider__bar"></span>
        <span class="rk-divider__label">PERCENTILES INACTIVOS (RF-RNK-09)</span>
        <span class="rk-divider__bar"></span>
      </div>
    }

    @for (f of filas(); track f.posicion) {
      <!-- Cierra la zona de promoción: va entre la última fila P90 y la primera regular. -->
      @if (corteP90() === f.posicion) {
        <div class="rk-divider rk-divider--up">
          <span class="rk-divider__bar"></span>
          <span class="rk-divider__label">ZONA DE PROMOCIÓN · P90</span>
          <span class="rk-divider__bar"></span>
        </div>
      }
      @if (primerP10() === f.posicion) {
        <div class="rk-divider rk-divider--down">
          <span class="rk-divider__bar"></span>
          <span class="rk-divider__label">ZONA DE RIESGO · P10</span>
          <span class="rk-divider__bar"></span>
        </div>
      }
      <div
        class="rk-row"
        [id]="esYo(f) ? 'rk-yo-row' : null"
        [class.rk-row--promo]="promociona(f)"
        [class.rk-row--riesgo]="enRiesgo(f)"
        [class.rk-row--me]="esYo(f)"
        (click)="seleccionar.emit(f)"
      >
        <span class="rk-row__pos tabular">{{ f.posicion }}</span>
        <span style="display:flex;align-items:center;gap:0.5rem;min-width:0">
          <img class="rk-row__avatar" [src]="f.avatarUrl" alt="" />
          <span style="min-width:0">
            <span class="rk-row__name" style="display:block">{{ etiqueta(f) }}</span>
            @if (promociona(f)) {
              <span class="rk-tag rk-tag--promo">PROMOCIÓN</span>
            } @else if (enRiesgo(f)) {
              <span class="rk-tag rk-tag--riesgo">RIESGO</span>
            }
            @if (esYo(f)) {
              <span class="ui-font" style="font-size:0.7rem;opacity:0.7;display:block"
                >Legajo {{ legajo(f) }}</span
              >
            }
          </span>
        </span>
        <span class="rk-row__cell">P{{ f.percentil }}</span>
        <span class="rk-row__cell rk-row__lv">Lv {{ f.nivelNodo }}</span>
        <span class="rk-row__xp tabular">{{ f.xpTotal }}</span>
      </div>
    }
  `,
})
export class RankingTablaAlumno {
  readonly vista = input.required<VistaRankingAlumno>();
  readonly seleccionar = output<FilaRanking | FilaRankingAnon>();

  /** Estado de la fila propia — `null` = alumno regular, sin banner. */
  protected readonly estado = computed<EstadoZona | null>(() => {
    const v = this.vista();
    const yo = v.yo;
    if (!yo) return 'fuera';
    if (!v.cortes) return 'inactivo';
    if (esCandidatoPromocion(yo)) return 'promocion';
    if (enRiesgoRegularidad(yo)) return 'riesgo';
    return null;
  });
  protected readonly copy = computed(() => {
    const e = this.estado();
    return e ? COPY[e] : null;
  });

  /** Cohorte completa con scroll — sin recortar (ya no hay podio que absorba el top). */
  protected readonly filas = computed<FilaLista[]>(() => this.vista().lista);

  /**
   * Posición de la primera fila FUERA de P90 — ahí se dibuja el divisor que cierra la
   * zona de promoción (queda entre los promocionados y los regulares). -1 si los
   * percentiles no están activos.
   */
  protected readonly corteP90 = computed(() =>
    this.vista().cortes
      ? (this.vista().lista.find((f) => f.zona !== 'p90')?.posicion ?? -1)
      : -1,
  );

  /** Posición de la primera fila en zona P10, para el divisor de riesgo. */
  protected readonly primerP10 = computed(
    () => this.vista().lista.find((f) => f.zona === 'p10')?.posicion ?? -1,
  );

  /** RF-RNK-05: P90 + 0 vidas perdidas históricas + 100 % de obligatorios. */
  protected promociona(f: FilaLista): boolean {
    return esCandidatoPromocion(f);
  }

  /** RF-RNK-06: P10 + obligatorios sin cerrar. */
  protected enRiesgo(f: FilaLista): boolean {
    return enRiesgoRegularidad(f);
  }

  protected esYo(f: FilaLista): boolean {
    return esIdentificada(f);
  }

  protected etiqueta(f: FilaLista): string {
    return esIdentificada(f) ? `${f.nombre} ${f.apellido} · vos` : f.seudonimo;
  }

  protected legajo(f: FilaLista): string {
    return esIdentificada(f) ? f.legajo : '';
  }

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }
}
