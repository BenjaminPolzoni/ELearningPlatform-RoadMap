# AGENTS.md — Registro de deuda técnica

> Formato [AGENTS.md](https://agents.md) — instrucciones para agentes de código que
> trabajen en este directorio o en cualquier plan bajo `path/`. Este archivo se aplica a
> `path/deuda-tecnica/` y a todo su contenido.

## Regla

Mientras ejecutás cualquier plan de `path/` (una épica, una fase, un documento numerado),
si descubrís que **falta implementar algo que no es crítico para cerrar esa tarea** —
algo corregible más adelante sin comprometer el sistema ni lo que estás construyendo
ahora mismo — **no lo dejes solo en la cabeza ni solo en un comentario del código**:
registralo acá, en un archivo dentro de esta carpeta.

Esto **no** reemplaza comentarios `TODO` en el código — los comentarios están bien y se
mantienen. Esto es el registro que sobrevive aunque alguien nunca abra ese archivo de
código, y el que permite ver de un vistazo qué falta en todo el proyecto.

## Cuándo aplica (y cuándo no)

| Situación | ¿Va acá? |
|---|---|
| Encontraste algo que falta, no bloquea la tarea actual, se puede pagar después | ✅ Sí — esto es deuda técnica |
| Encontraste un **bug** en código que ya existe | ❌ No — corregilo en el momento. Si por alcance no podés corregirlo ahora, ahí sí es deuda: registralo explicando por qué quedó sin corregir |
| Encontraste una **decisión de arquitectura sin cerrar** que necesita que la cátedra, el equipo o el usuario decidan (no vos) | ❌ No — va a la lista de dudas abiertas del plan correspondiente (ej. `path/README.md` §6), no acá |
| Terminaste una tarea y quedó 100% completa, sin cabos sueltos | ❌ No hay nada que registrar |

La distinción clave: **deuda** es algo que **vos** podés resolver más adelante sin
preguntarle a nadie. **Duda** es algo que necesita que **otra persona** decida antes de
que se pueda resolver.

## Convención de nombres

Un archivo por **plan de origen** — el documento de `path/` que se estaba ejecutando
cuando se descubrió la deuda. Agrupa las deudas relacionadas en vez de dispersarlas en
un archivo por ítem.

```
tarea-deuda-{nombre-del-plan}.md
```

`{nombre-del-plan}` es el nombre del archivo en `path/` **sin la extensión `.md`** donde
se descubrió la deuda. Ejemplos reales de este repo:

| Se descubrió trabajando en... | Archivo de deuda |
|---|---|
| `path/01-arquitectura-y-stack.md` | `tarea-deuda-01-arquitectura-y-stack.md` |
| `path/02-modelo-de-datos.md` | `tarea-deuda-02-modelo-de-datos.md` |
| `path/03-plan-de-implementacion.md` | `tarea-deuda-03-plan-de-implementacion.md` |
| `path/06-contrato-api.md` | `tarea-deuda-06-contrato-api.md` |

Si el plan de origen no tiene un archivo numerado propio (por ejemplo, surgió de una
conversación o de una tarea puntual sin documento dedicado), usá el nombre más
descriptivo y estable posible del área de trabajo — no inventes un número.

## Workflow paso a paso

1. **Detectá** el gap mientras implementás — no lo busques activamente, surge solo al
   construir.
2. **Clasificá** con la tabla de arriba: ¿es deuda, bug, o duda? Si es deuda, seguí.
3. **Buscá si ya existe** el archivo `tarea-deuda-{plan-de-origen}.md` en esta carpeta.
   - Si existe: agregale un ítem nuevo al final, no crees un archivo paralelo.
   - Si no existe: crealo con el template de abajo.
4. **Escribí el ítem** con las 4 partes obligatorias (ver template).
5. **Actualizá el índice** en `README.md` de esta carpeta: contador de la fila
   correspondiente y el total.
6. **Seguí con tu tarea** — registrar la deuda no te bloquea, es justo lo contrario:
   te permite anotarla y seguir sin resolverla ahora.

## Template de un ítem

Cada archivo `tarea-deuda-*.md` es una lista de ítems con esta forma exacta:

```markdown
## 🔴 N. Título corto y específico

**Qué falta:** una o dos frases. Concreto, no vago ("falta X") — decí exactamente
qué comportamiento o pieza no existe todavía.

**Dónde vive:** ruta de archivo(s) relevante(s), con un comentario `TODO` en el
código si corresponde (ver "Regla" arriba — esto no reemplaza el comentario, lo
complementa).

**Por qué no bloquea la tarea actual:** la justificación real de por qué esto se
puede diferir. Si no podés justificarlo con una frase honesta, probablemente no
sea deuda — es un bug o un bloqueo real.

**Cómo se paga:** la condición o el evento que va a disparar la resolución
("cuando el Grupo X publique su servicio", "en la Fase 2", "cuando se resuelva
la duda Y del README"). Si no sabés cuándo, escribí "sin trigger claro todavía"
en vez de inventar uno.
```

Estados: **🔴 abierta** · **🟢 pagada**. Un ítem pagado queda con el título tachado
(`~~texto~~`), el emoji cambiado a 🟢, y las secciones "Qué falta"/"Dónde vive" pasan a
tiempo pasado ("Qué faltaba"/"Dónde vivía") seguidas de una sección **"Pagada:"** que
explica cómo y en qué commit/tarea se resolvió — nunca se borra, es historial del
proyecto.

## Índice

`README.md` en esta misma carpeta mantiene la tabla con el archivo, el plan de origen,
y el conteo de ítems abiertos por archivo, más el total. **Actualizalo siempre** que
agregues o pagues un ítem — un índice desactualizado es peor que no tener índice.

## Ejemplo real de este repo

Ver [`tarea-deuda-06-contrato-api.md`](tarea-deuda-06-contrato-api.md) — tiene 4 ítems
que siguen el template exacto, incluida una deuda que ya fue pagada en una sesión
posterior (el `ConsumerFactory` único de Kafka, resuelta al implementar un segundo tipo
de evento) — buen ejemplo de cómo se marca 🟢 sin borrar el historial.
