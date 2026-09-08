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
| [tarea-deuda-06-contrato-api.md](tarea-deuda-06-contrato-api.md) | `06-contrato-api.md` | 8 | 1 |

**Total: 13 ítems abiertos, 1 pagado.** Última revisión: al implementar el cierre de curso — se sumó el ítem #9 (gates de encuesta y scores IA en cierre/estado). Antes: ranking
(percentiles + cascada de desempate) — se sumaron los ítems #7 (`inscriptos_activos`
real desde Cursos) y #8 (ranking materializado / recálculo por evento) a
`06-contrato-api.md`.

> 📄 Ver [`AGENTS.md`](AGENTS.md) en esta misma carpeta — la convención completa
> (cuándo aplica, nombrado, template, workflow) para cualquier agente que trabaje acá.
