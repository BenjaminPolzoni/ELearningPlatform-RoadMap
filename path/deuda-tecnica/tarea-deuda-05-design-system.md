# Deuda técnica — descubierta ejecutando `05-design-system.md`

## ✅ 1. El tablero de unidad ignora `posicion_x` / `posicion_y` — pagada (G9, editor gráfico)

**Qué falta:** que el tablero interno de la unidad ubique cada casillero en la posición
que el profesor definió. Hoy calcula un layout serpenteante de 4 columnas a partir del
orden de las actividades, así que el profesor no tiene ninguna forma de decidir la forma
del recorrido — que es justamente lo que promete 05 §5 ("el profesor define `posicion_x`
/ `posicion_y` de cada nodo en el editor; el SVG los ubica sobre una grilla").

**Dónde vive:** `frontend/src/app/features/alumno/unidad-mapa.ts` — constantes `COLS`,
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

## 🔴 5. Las features usan clases daisyUI directo en vez de los `ui-*` de `shared/ui`

**Qué falta:** migrar los componentes reales (login, mapa, tablero, insignias, ranking…) a
consumir `ui-button`, `ui-card`, `ui-modal`, `ui-input`, `ui-select`, etc. Hoy esas pantallas
siguen escribiendo las clases sueltas (`btn btn-primary`, `card`, `badge-*`, `modal-*`)
en cada template.

**Dónde vive:** los `ui-*` probados en `frontend/src/app/shared/ui/{button,card,badge,input,
textarea,select,modal}.ts`; los consumidores sin migrar son `features/*` y los componentes
legacy de `shared/ui` (`inventory-modal.ts`, `hud.ts`).

**Por qué no bloquea la tarea actual:** los `ui-*` se entregaron como infraestructura —
"proveídos, no migrados", por decisión de G6 — para no pisar el trabajo en paralelo de los
otros grupos. El aspecto ya queda unificado porque daisyUI deriva los tokens de los mismos
temas, así que el valor estaba tanto en los componentes como en la paleta (ya aplicada).

**Cómo se paga:** cuando cada squad toque su feature y reemplace las clases por el
componente correspondiente; o en una iteración G6 dedicada a la migración yo mismo.

---

## 🔴 6. Hex de la paleta vieja hardcodeados en el chrome global

**Qué falta:** tres piezas del chrome (no del arte del mapa) usan el rosa fuego heredado
`#FF2758` en vez del acento oficial G6 `#FF2E93`. El arte del avatar y del mapa (que sí
conservan `#FF2758` a propósito, aislados en `@theme`/catálogo) quedan fuera de este ítem.

**Dónde vive:** `frontend/src/app/shared/ui/xp-bar.ts:71` (glow del relleno de la barra),
`frontend/src/app/shared/ui/lives.ts:29-30` (relleno/trazo del corazón), y
`frontend/src/app/features/login/login.ts:32` (halo `drop-shadow` del título).

**Por qué no bloquea la tarea actual:** son brillos y detalles de 6-8px; entre `#FF2758` y
`#FF2E93` no hay diferencia de contraste ni de significado, y las superficies (rellenos,
textos) ya salen de los tokens del tema.

**Cómo se paga:** una pasada chica de limpieza al migrar esas piezas a `ui-*` (ítem #5) o
en cualquier retoque visual posterior.
