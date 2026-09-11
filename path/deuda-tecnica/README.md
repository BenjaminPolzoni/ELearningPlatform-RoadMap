# Deuda técnica

Acá se registra lo que se descubre **al implementar** un plan de `path/` y que falta —
pero que **no es crítico para cerrar esa tarea**: se puede corregir más adelante sin
comprometer el sistema ni lo que se está construyendo ahora mismo. No es una lista de
dudas para la cátedra (eso vive en `path/README.md` §6) ni un bug — un bug se corrige en
el momento, no se archiva acá.

## Convención

- Un archivo por **plan de origen** (el documento de `path/` que se estaba ejecutando
  cuando se encontró la deuda) — agrupa las deudas relacionadas en vez de dispersarlas.
- Nombre: `tarea-deuda-{nombre-del-plan}.md`, donde `{nombre-del-plan}` es el nombre del
  archivo en `path/` (sin `.md`) donde se descubrió.
- Cada ítem dentro del archivo lleva: **qué falta**, **dónde vive en el código**, **por
  qué no bloquea la tarea actual**, y **cuándo/cómo se paga**.
- Estado: 🔴 abierta · 🟢 pagada (se deja igual, tachada, no se borra — es historial).

## Índice

| Archivo | Plan de origen | Ítems abiertos | Pagados |
|---|---|---|---|
| [tarea-deuda-01-arquitectura-y-stack.md](tarea-deuda-01-arquitectura-y-stack.md) | `01-arquitectura-y-stack.md` | 1 | 0 |
| [tarea-deuda-02-modelo-de-datos.md](tarea-deuda-02-modelo-de-datos.md) | `02-modelo-de-datos.md` | 2 | 0 |
| [tarea-deuda-03-plan-de-implementacion.md](tarea-deuda-03-plan-de-implementacion.md) | `03-plan-de-implementacion.md` | 2 | 0 |
| [tarea-deuda-04-engine-2-5d.md](tarea-deuda-04-engine-2-5d.md) | `04-engine-2-5d.md` | 2 | 0 |
| [tarea-deuda-05-design-system.md](tarea-deuda-05-design-system.md) | `05-design-system.md` | 4 | 1 |
| [tarea-deuda-06-contrato-api.md](tarea-deuda-06-contrato-api.md) | `06-contrato-api.md` | 8 | 2 |

**Total: 19 ítems abiertos, 3 pagados.** Última revisión: al rediseñar el avatar (género +
catálogo dev): abrió el ítem #5 de 05-design-system.md (textos sin i18n) y corrigió el
conteo del ítem #1, que ya estaba pagado. Antes: al rediseñar el front sobre la
paleta de marca (mapa 2.5D isométrico + tablero de unidad + avatar personalizable) —
abrió los dos archivos nuevos, `04-engine-2-5d.md` (el mapa quedó en SVG y no en three.js;
falta la suite de tests de `layoutIslas()`) y `05-design-system.md` (posiciones de nodo,
conexiones, avatar en localStorage, curva PAR-09 duplicada en el front). Antes: la curva
de niveles (RF-NIV-03/04/05) abrió el ítem #10 de `06-contrato-api.md` (el nivel derivado
del alumno todavía no tiene endpoint, lo pide el HUD). Antes: Camino 6
(`CursoArchivadoEvent` → modo lectura) pagó el ítem #6 (409 por curso archivado); cierre
de curso (ítem #9) y ranking (ítems #7 y #8).

> 📄 Ver [`AGENTS.md`](AGENTS.md) en esta misma carpeta — la convención completa
> (cuándo aplica, nombrado, template, workflow) para cualquier agente que trabaje acá.
