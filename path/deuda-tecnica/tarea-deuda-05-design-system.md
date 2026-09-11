# Deuda técnica — descubierta ejecutando `05-design-system.md`

## 🟢 1. ~~El tablero de unidad ignora `posicion_x` / `posicion_y`~~ (G9, editor gráfico)

**Qué faltaba:** que el tablero interno de la unidad ubique cada casillero en la posición
que el profesor definió. Hoy calcula un layout serpenteante de 4 columnas a partir del
orden de las actividades, así que el profesor no tiene ninguna forma de decidir la forma
del recorrido — que es justamente lo que promete 05 §5 ("el profesor define `posicion_x`
/ `posicion_y` de cada nodo en el editor; el SVG los ubica sobre una grilla").

**Dónde vivía:** `frontend/src/app/features/alumno/unidad-mapa.ts` — constantes `COLS`,
`CW`, `CH`, `X0`, `Y0` y el `computed` `casilleros()`, con un `⚠️` en el JSDoc del
componente. Del lado del modelo, `Actividad` en
`frontend/src/app/core/data/roadmap.models.ts` tampoco tiene los campos.

**Por qué no bloquea la tarea actual:** el layout calculado produce un tablero correcto y
recorrible para cualquier cantidad de actividades, y la caminata del avatar solo depende
de que los nodos consecutivos queden alineados en un eje — condición que la serpentina
garantiza. El rediseño visual se puede cerrar y verificar entero sin esto.

**Cómo se paga:** cuando el editor del profesor incorpore el canvas de posicionamiento de
nodos. Ahí se agregan `posicionX`/`posicionY` a `Actividad`, y `casilleros()` pasa a
leerlos con la serpentina como fallback para las actividades que todavía no fueron
posicionadas.

**Pagada:** `Actividad.posicionX`/`posicionY` existen desde G9 (editor gráfico del
profesor, `features/profesor/nodo-canvas.ts`); el adapter les asigna una posición default
no solapada al crearlas y migra los datos viejos de `localStorage`. `casilleros()` en
`unidad-mapa.ts` las lee directo, con la serpentina como fallback defensivo si alguna
llegara sin posición; `ancho()`/`alto()` ahora son el bounding box real de los nodos en vez
de una grilla fija.

---

## 🔴 2. El tablero conecta actividades por orden, no por `RoadmapConexion`

**Qué falta:** dibujar los caminos del tablero a partir de las conexiones reales entre
nodos (05 §5: "los caminos son `<path>` entre nodos conectados (`RoadmapConexion`)"). Hoy
se asume una cadena lineal `i → i+1`, así que una unidad con ramas o con dos prerequisitos
convergentes se dibujaría como una fila única y falsa.

**Dónde vive:** `frontend/src/app/features/alumno/unidad-mapa.ts` — `computed` `tramos()`
y el cálculo de `alcanzable` dentro de `casilleros()`.

**Por qué no bloquea la tarea actual:** el modelo del front (`Unidad.actividades`) todavía
no expone conexiones, y el seed de Fases 0-2 define las unidades como cadenas lineales —
la representación actual es fiel al dato que hay. Es el mismo movimiento lineal que ya
describe 05 §5.

**Cómo se paga:** cuando `RoadmapConexion` llegue al contrato del front (Fase 3, junto con
el `HttpRoadmapAdapter`). `tramos()` pasa a iterar conexiones y `alcanzable` a evaluar
prerequisitos en vez de comparar índices.

---

## 🔴 3. El avatar del alumno vive solo en `localStorage`

**Qué falta:** persistir el avatar personalizado en el perfil del alumno, para que lo
siga entre dispositivos y para que otros módulos (ranking, notificaciones del Grupo 2)
puedan mostrarlo. Hoy se guarda en `localStorage` y se pierde al cambiar de navegador.

**Dónde vive:** `frontend/src/app/core/avatar/avatar.service.ts` (clave `mock-avatar`).
Los ids del catálogo (`avatar.models.ts`) ya están pensados para viajar como DTO: se
persisten ids estables, no hex.

**Por qué no bloquea la tarea actual:** es la misma decisión que ya tomaron
`AuthMockService` y `ThemeService` para las Fases 0-2 — no hay backend de identidad contra
el que persistir, y el avatar cumple su función (recorrer el mapa y el tablero) igual.

**Cómo se paga:** en Fase 3, cuando el BFF exponga el perfil del alumno. `AvatarService`
queda como cache local de ese perfil sin cambiar su API pública (`avatar()`, `set()`).

---

## 🔴 4. La curva de niveles PAR-09 está duplicada en el front

**Qué falta:** que el HUD reciba el nivel del alumno ya resuelto por el backend, en vez de
derivarlo de nuevo. Hoy `xp-bar.ts` replica los 10 umbrales de PAR-09 y repite la lógica
de `CurvaNiveles.nivelPara(xp)`.

**Dónde vive:** `frontend/src/app/shared/ui/xp-bar.ts` — `UMBRALES_PAR_09` y `nivelDe()`,
con el `⚠️` correspondiente. La contraparte es
`backend/ms-roadmap/.../domain/service/CurvaNiveles.java`.

**Por qué no bloquea la tarea actual:** la barra de XP necesita mostrar *algún* nivel y la
curva por defecto está congelada en `path/README.md` §PAR-09, así que la duplicación da el
mismo resultado que el backend para todo curso que no haya definido una curva propia.

**Cómo se paga:** junto con el ítem #10 de
[`tarea-deuda-06-contrato-api.md`](tarea-deuda-06-contrato-api.md) — es la misma causa
raíz (el nivel del alumno no tiene endpoint). Cuando ese endpoint exista se borran
`UMBRALES_PAR_09` y `nivelDe()`, y con eso se arregla además el caso que hoy queda mal: un
curso con curva **custom** (RF-NIV-04) muestra el nivel de la curva por defecto.

---

## 🔴 5. Los textos del editor de avatar (y del resto del front) no pasan por i18n

**Qué falta:** que los textos visibles del frontend se resuelvan por i18n, como pide la
regla "Sin strings hardcodeados (RF-NFR-07)" de `path/05-design-system.md`. Hoy están
escritos directo en los templates, y el rediseño del avatar (género + catálogo dev) sumó
más: rótulos de pestañas y secciones, avisos del editor y el `nombre` de cada opción del
catálogo.

**Dónde vive:** `frontend/src/app/features/alumno/avatar-editor.ts` (template) y
`frontend/src/app/core/avatar/avatar.models.ts` (campo `nombre` de cada opción). El mismo
patrón se repite en todas las features del frontend; no hay ninguna librería de i18n
instalada (`frontend/package.json`).

**Por qué no bloquea la tarea actual:** el MVP es solo en español y el editor funciona y es
accesible igual. Montar i18n es una decisión transversal a todo el front, no del avatar.

**Cómo se paga:** sin trigger claro todavía — cuando se monte i18n en el frontend. Los
`nombre` del catálogo pasan a ser claves de traducción indexadas por `id`, que ya son
estables.
