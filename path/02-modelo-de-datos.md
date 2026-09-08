# 02 · Modelo de datos

## 1. Los 4 principios del diseño

1. **Todo está atado a un curso-cohorte.** No hay dato "global" de un alumno — su XP, sus vidas
   y su progreso existen solo dentro de un curso puntual.
2. **XP y vidas son historial, no contador.** Un puntaje se puede corregir después (apelación de
   score de IA, RF-IA-18) y necesitamos saber si un alumno *alguna vez* perdió una vida aunque
   después la haya recuperado. Un campo que solo suma no puede responder eso.
3. **Lo que no es nuestro, es cache.** El nombre del alumno o el estado del curso los guardamos
   localmente, pero solo como copia alimentada por eventos — nunca somos la fuente de verdad.
4. **El ranking se recalcula, no se edita a mano.** Es una vista derivada del resto de las tablas.

---

## 2. Mapeo de vocabulario

El vocabulario del mock y el del modelo formal son la misma cosa. Esta tabla evita confusiones
entre el equipo de UI y el de backend:

| En la UI / el juego | En el modelo | En el mapa |
|---|---|---|
| **Curso** | `Roadmap` (+ `curso_cohorte_id`) | El mundo entero |
| **Unidad** | `RoadmapSeccion` | Una **isla** |
| **Actividad** | `RoadmapNodo` | Un **nodo** dentro de la isla |
| **Camino / prerequisito** | `RoadmapConexion` | La línea neón entre nodos |
| **Vida** | `MovimientoVida` | El corazón del HUD |
| **Nivel** | derivado de `xp_total` | El rótulo del HUD |

---

## 3. Entidades propias

Somos **dueños exclusivos** de estas tablas. Nadie más las toca directamente.

### Grafo del roadmap

```
Roadmap
  id, curso_cohorte_id, estado(borrador|publicado), creado_en, actualizado_en

RoadmapSeccion              ← la "unidad" / isla
  id, roadmap_id, nombre, umbral_xp_desbloqueo, orden

RoadmapNodo                 ← la "actividad"
  id, seccion_id, tipo, desafio_id, posicion_x, posicion_y,
  es_obligatorio, reintentos_permitidos

RoadmapConexion
  id, roadmap_id, nodo_origen_id, nodo_destino_id
```

### Progreso, XP y vidas

```
ProgresoNodo
  id, alumno_id, curso_cohorte_id, nodo_id, estado, intentos_usados, completado_en

MovimientoXP                ← historial, nunca se sobrescribe
  id, alumno_id, curso_cohorte_id, nodo_id, tipo, monto,
  rubric_version, origen_evento_id, registrado_en

MovimientoVida              ← historial, nunca se sobrescribe
  id, alumno_id, curso_cohorte_id, nodo_id, desafio_recuperacion_id, tipo,
  origen_evento_id, registrado_en

VidasEstado                 «vista calculada»
  alumno_id, curso_cohorte_id, vidas_vigentes, vidas_perdidas_historico

DesafioRecuperacion         ← pool por curso (RF-REC-06), no un nodo del mapa
  id, curso_cohorte_id, desafio_id
```

> `nodo_id` y `desafio_recuperacion_id` en `MovimientoVida` son campos separados a
> propósito: apuntan a tablas distintas y nunca se llenan los dos a la vez — mezclarlos en
> una sola columna habría hecho ambiguo a qué tabla mirar después.

### Niveles, insignias, ranking y cierre

```
NivelDefinicion
  id, curso_cohorte_id, nombre, umbral_xp, orden

InsigniaOtorgada
  id, alumno_id, curso_cohorte_id, insignia_id, origen_evento_id, otorgada_en

RankingEntrada              «vista materializada»
  alumno_id, curso_cohorte_id, xp_total, posicion, percentil, zona,
  candidato_promocion, insignias_count, vidas_perdidas_historico,
  ejercicios_completados, actualizada_en

EstadoAcademicoFinal
  alumno_id, curso_cohorte_id, estado, confirmado_por, confirmado_en
```

### Caches externos (no somos dueños)

```
CursoCohorteContexto        «cache externo» ← alimentado por evento de Cursos (T02)
  curso_cohorte_id, estado, inscriptos_activos, actualizado_en

AlumnoPerfilCache           «cache externo» ← alimentado por Identidad (T01)
  alumno_id, avatar_url, nombre, apellido, legajo, baja_logica
```

---

## 4. Enumeraciones

```
EstadoRoadmap       : borrador | publicado
EstadoNodo          : bloqueado | habilitado | completado | fallado
TipoMovimientoXP    : otorgado_desafio | ajuste_uso_ia | ajuste_apelacion | desafio_personalizado
TipoMovimientoVida  : inicial | perdida | recuperada | comprada
Zona                : ninguna | p90 | p10
EstadoAcademico     : promocionado | regular | no_regular | abandono
EstadoCursoCohorte  : draft | activo | archivado
```

### ⚠️ Extensión propuesta de `TipoNodo`

El modelo original define solo `TipoNodo { desafio, hito }`. El mock necesita distinguir el
material del ejercicio, así que se propone:

```
TipoNodo : teoria              ← material teórico (lectura)
         | practica            ← material práctico (guía, ejemplo)
         | desafio_teorico     ← actividad evaluada, Tema 04
         | desafio_practico    ← actividad evaluada con IDE, Tema 05
         | hito                ← marcador sin evaluación
         | boss                ← desafío de cierre de unidad
```

> **Corrección:** `recuperacion` vivió acá como un valor más hasta implementar el Camino 3
> en serio. RF-REC-06 describe un **pool por curso** ("cargado por el profesor"), no un
> nodo posicionado en el mapa — modelarlo como `TipoNodo` hubiera forzado cada desafío de
> recuperación a tener una sección y una posición (x,y) sin sentido para algo que nunca se
> dibuja en el grafo. Ver `DesafioRecuperacionEntity` más abajo.

> **Estado: propuesta.** Es un cambio de contrato que hay que validar con el equipo antes de
> cerrarlo, porque afecta lo que el Motor de Desafíos (T03) espera recibir en `desafio_id`.

---

## 5. Máquina de estados del nodo

Es el **único** lugar del modelo donde una transición tiene condición clara y efecto secundario
real. Ni el estado del curso ni la zona del ranking se modelan así (el primero no es nuestro, la
segunda se recalcula entera en cada corrida).

```
[*] ──> bloqueado

bloqueado  ──> habilitado   : XP acumulado en la sección >= umbral_xp_desbloqueo   (RF-CUR-06)

habilitado ──> completado   : DesafioCompletadoEvent (éxito)
habilitado ──> habilitado   : DesafioCompletadoEvent (fallo) y quedan reintentos
habilitado ──> fallado      : DesafioCompletadoEvent (fallo) y reintentos agotados
                              / descuenta 1 vida                                   (RF-DES-07)

fallado    ──> completado   : DesafioCompletadoEvent (éxito) — se puede seguir intentando
fallado    ──> fallado      : DesafioCompletadoEvent (fallo) / descuenta 1 vida otra vez

completado ──> [*]
```

> ⚠️ **Corrección sobre una versión anterior de este diagrama.** Existía una arista
> `fallado → habilitado` atribuida a RF-REC-04 ("nuevo intento disponible tras recuperar
> vida"). Esa arista **contradecía la propia aclaración de la sección de abajo** ("el nodo
> nunca queda bloqueado por sí mismo… cada fallo siguiente vuelve a pasar por este mismo
> camino y descuenta otra vida") y quedó detectada recién al implementar el patrón State en
> código (`EstadoNodo.java`) — escribirlo como transiciones explícitas hizo evidente la
> inconsistencia que en prosa quedaba disimulada. **Corregida acá.**

### Reglas de vidas asociadas

- Se descuenta 1 vida **únicamente** al agotar los reintentos permitidos **y volver a fallar**.
- Un nodo en `fallado` **no** queda bloqueado para siempre: el alumno puede seguir intentando
  ese mismo nodo (puede incluso completarlo) y **pierde otra vida en cada fallo posterior**,
  sin que existan más "reintentos gratis" — esos ya se gastaron para llegar a `fallado`.
  *(Duda cerrada con la cátedra.)*
- **`fallado` es un estado del nodo, no del alumno.** Recuperar una vida (RF-REC-04) no
  cambia el estado de ESTE nodo — solo destraba que el alumno pueda seguir intentando
  *cualquier* nodo, incluido este. Ese es un gate aparte, a nivel alumno, no una transición
  de esta máquina de estados (ver duda abierta: qué módulo controla ese gate).
- Lo que se bloquea al llegar a **0 vidas** es el alumno entero, no el nodo puntual.
- Los desafíos **personalizados por LLM nunca consumen vidas**, sin importar cuántas veces fallen.
- `vidas_vigentes` respeta un techo (PAR-12, default 3). `vidas_perdidas_historico` **nunca decrece**,
  ni con compras ni con recuperaciones.

---

## 6. Por qué el XP no puede ser un contador

Una apelación de score de IA (RF-IA-18) puede **reducir** XP ya otorgado, después del hecho.
Un campo `xp_total` que solo suma no puede representar eso sin perder auditabilidad.

Por eso:

- Cada otorgamiento se registra como un `MovimientoXP` nuevo.
- Una corrección **agrega un movimiento** de tipo `ajuste_apelacion` con el delta — **nunca**
  edita el movimiento original.
- `xp_total` es la **suma de movimientos vigentes**, cacheada y recalculada por evento.
- Un cambio de parámetro global (PAR-01, PAR-05, PAR-09…) rige **solo hacia adelante**
  (RF-CFG-06). Los desafíos ya resueltos conservan el XP con que fueron otorgados.

El mismo patrón aplica a las vidas, por la misma razón: necesitamos responder *"¿este alumno
alguna vez perdió una vida?"* aunque después la haya recuperado o comprado.

---

## 7. Reglas del ranking

| Regla | Detalle |
|---|---|
| Orden | Siempre por **XP real acumulado**, nunca por nivel (RF-NIV-05) |
| Percentiles | P90/P10 activos **solo** con ≥ 10 inscriptos activos (RF-RNK-09) |
| Candidato a promoción | P90 **+** `vidas_perdidas_historico == 0` **+** 100 % de obligatorios aprobados (RF-RNK-05) |
| Riesgo de regularidad | P10 **+** no superó todos los ejercicios (RF-RNK-06) |
| Desempate | 1° más insignias · 2° menos vidas perdidas históricas · 3° más ejercicios completados (RF-RNK-11) |
| Recálculo | En cada evento relevante (XP, vidas, insignias, progreso). Nunca editable a mano |
| Transición de zona | Se detecta comparando la corrida anterior contra la actual → emite evento a Notificaciones |

### Visibilidad para el ALUMNO (RF-RNK-03 / 07)

- Ve su **propio puntaje completo**
- Ve **top 3** y **bottom 3**
- Ve los puntajes inmediatos a los cortes **P90/P10 sin identidad**
- Click en fila **propia** → detalle completo con datos personales
- Click en fila **ajena** → XP, insignias, monedas y vidas **sin identificar al alumno**

> ⚠️ El detalle de fila pide **monedas**, que no son un dato nuestro (viven en el Banco, T08).
> **El BFF** (no nuestro) las agrega al armar la pantalla; nosotros solo devolvemos datos propios.
> Por eso `AlumnoPerfilCache` (avatar/nombre/legajo) queda **redundante** si el BFF enriquece —
> decisión a confirmar (ver `06-contrato-api.md` §6.2).

---

## 8. Seed del curso de ejemplo

Para que los 4 squads trabajen en paralelo sin esperarse, existe un curso precargado en
`frontend/src/app/mocks/seed-curso.ts`:

- **1 curso-cohorte** — *"Programación IV · Comisión 2025"*
- **4 unidades** (islas) con umbrales de XP crecientes
- **~6 actividades por unidad**, mezclando `teoria`, `practica`, `desafio_teorico`,
  `desafio_practico` y un `boss` de cierre
- **12 alumnos** con XP variado — suficiente para superar el umbral de 10 y que las
  zonas P90/P10 se activen de verdad
- Un alumno con `vidas_perdidas_historico > 0` para probar que **no** califica a promoción
- Un alumno en 0 vidas para probar el flujo de recuperación

> El seed no es descartable: es el fixture con el que se prueba el ranking y el que se usa
> en la demo a la cátedra.
