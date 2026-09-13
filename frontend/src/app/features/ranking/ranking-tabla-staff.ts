import { Component, input, output } from '@angular/core';
import { FilaRanking, VistaRankingStaff } from '../../core/data/ranking.models';
import { enRiesgoRegularidad, esCandidatoPromocion } from '../../domain/ranking/ranking.reglas';
import { AvatarSprite } from '../../shared/ui/avatar-sprite';

/**
 * Vista de PROFESOR/ADMIN (RF-RNK-10): tabla densa, identificada y sin anonimato, con las
 * columnas mínimas para escanear la cohorte — puesto, alumno, legajo, percentil, XP, vidas
 * perdidas históricas y el estado sugerido (candidato a promoción RF-RNK-05 / riesgo de
 * regularidad RF-RNK-06). El resto (nodo actual, insignias, ejercicios, % de obligatorios)
 * vive en el detalle "INFO" al hacer click en la fila, para no desbordar la pantalla CRT
 * del gabinete.
 */
@Component({
  selector: 'app-ranking-tabla-staff',
  imports: [AvatarSprite],
  template: `
    <div class="staff-scroll">
      <table class="staff">
        <thead>
          <tr>
            <th>#</th>
            <th style="text-align:left">Alumno</th>
            <th style="text-align:left">Legajo</th>
            <th title="Percentil dentro de la cohorte">Pctl</th>
            <th style="text-align:right">XP</th>
            <th title="Vidas perdidas históricas">
              <span class="rk-ico rk-ico--heartbreak" aria-hidden="true"></span>
            </th>
            <th style="text-align:left">Estado</th>
          </tr>
        </thead>
        <tbody>
          @for (f of vista().filas; track f.alumnoId) {
            <tr
              [class.up]="f.zona === 'p90'"
              [class.down]="f.zona === 'p10'"
              [class.promo]="candidato(f)"
              [class.riesgo]="riesgo(f)"
              (click)="seleccionar.emit(f)"
            >
              <td class="tabular">{{ f.posicion }}</td>
              <td class="staff__alumno">
                <div class="staff__ident">
                  <ui-avatar-sprite class="rk-row__avatar" [config]="f.avatar" [alto]="43" />
                  <b class="staff__nombre">{{ f.nombre }} {{ f.apellido }}</b>
                </div>
              </td>
              <td class="staff__legajo">{{ f.legajo }}</td>
              <td class="tabular">P{{ f.percentil }}</td>
              <td class="tabular" style="text-align:right;color:var(--rk-yellow)">
                {{ f.xpTotal }}
              </td>
              <td class="tabular">{{ f.vidasPerdidasHistorico }}</td>
              <td style="text-align:left">
                @if (candidato(f)) {
                  <span class="tag tag--ok">promoción</span>
                } @else if (riesgo(f)) {
                  <span class="tag tag--risk">riesgo</span>
                } @else {
                  <span style="opacity:0.4">—</span>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .staff-scroll {
      overflow-x: auto;
    }
    .staff {
      width: 100%;
      border-collapse: collapse;
      font-family: var(--font-console);
      font-size: 1.05rem;
      color: var(--rk-ink);
    }
    /* encabezados en VT323: los labels son palabras ("Alumno", "Estado"),
       en Press Start 2P a este tamaño no se leían. */
    .staff th {
      font-family: var(--font-console);
      font-size: 1rem;
      line-height: 1.2;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      text-align: center;
      color: var(--rk-cyan);
      padding: 0.5rem 0.6rem;
      border-bottom: 2px solid var(--rk-cyan);
      background: var(--rk-bg2);
      white-space: nowrap;
    }
    .staff td {
      text-align: center;
      padding: 0.5rem 0.5rem;
      border-bottom: 1px solid var(--rk-bg3);
      cursor: pointer;
    }
    /* Alumno + legajo: dos columnas alineadas a la izquierda para que cada
       nombre quede enfrentado con su legajo y ambos se lean sin esfuerzo. */
    .staff__alumno {
      text-align: left;
    }
    .staff__ident {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .staff__ident .rk-row__avatar {
      width: 28px;
      height: 28px;
      flex: none;
    }
    .staff__nombre {
      text-transform: uppercase;
      letter-spacing: 0.03em;
      white-space: nowrap;
    }
    .staff__legajo {
      text-align: left;
      /* Dato de auditoría, no el protagonista de la fila: chico para no competir
         con el nombre del alumno. */
      font-family: var(--font-ui);
      font-size: 0.55rem;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.02em;
      color: var(--rk-cyan);
      white-space: nowrap;
    }
    /* datos numéricos en Press Start 2P; el nombre del alumno queda en VT323 (celda base) */
    .staff td.tabular {
      font-family: var(--font-title);
      font-size: 0.8rem;
      line-height: 1.5;
    }
    .staff tbody tr:hover {
      background: var(--rk-bg3);
    }
    .staff tr.up td:first-child {
      color: var(--rk-green);
    }
    .staff tr.down td:first-child {
      color: var(--rk-magenta);
    }
    .tag {
      font-family: var(--font-title);
      font-size: 0.42rem;
      letter-spacing: 0.08em;
      padding: 0.3rem 0.45rem;
      border: 2px solid currentColor;
      border-radius: 2px;
      white-space: nowrap;
    }
    .tag--ok {
      color: var(--rk-green);
      text-shadow: 0 0 6px rgba(57, 255, 136, 0.6);
    }
    .tag--risk {
      color: var(--rk-magenta);
      text-shadow: 0 0 6px rgba(255, 46, 147, 0.6);
    }
    /* Neón de fila igual que la lista del alumno (.rk-row--promo / --riesgo):
       fondo tenue + barra lateral + resplandor. En tabla con border-collapse el
       box-shadow del <tr> no pinta, así que el bloom va como drop-shadow. */
    .staff tbody tr.promo {
      background: rgba(57, 255, 136, 0.09);
      filter: drop-shadow(0 0 8px rgba(57, 255, 136, 0.35));
    }
    .staff tbody tr.promo:hover {
      background: rgba(57, 255, 136, 0.16);
    }
    .staff tbody tr.promo td {
      border-bottom-color: rgba(57, 255, 136, 0.4);
    }
    .staff tbody tr.promo td:first-child {
      box-shadow: inset 5px 0 0 var(--rk-green);
      color: var(--rk-green);
    }
    .staff tbody tr.riesgo {
      background: rgba(255, 46, 147, 0.09);
      filter: drop-shadow(0 0 8px rgba(255, 46, 147, 0.35));
    }
    .staff tbody tr.riesgo:hover {
      background: rgba(255, 46, 147, 0.16);
    }
    .staff tbody tr.riesgo td {
      border-bottom-color: rgba(255, 46, 147, 0.4);
    }
    .staff tbody tr.riesgo td:first-child {
      box-shadow: inset 5px 0 0 var(--rk-magenta);
      color: var(--rk-magenta);
    }
  `,
})
export class RankingTablaStaff {
  readonly vista = input.required<VistaRankingStaff>();
  readonly seleccionar = output<FilaRanking>();

  protected candidato = esCandidatoPromocion;
  protected riesgo = enRiesgoRegularidad;
}
