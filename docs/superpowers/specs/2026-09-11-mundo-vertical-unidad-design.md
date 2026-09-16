# Mapa panorámico por unidad (port desde `feature/integrar-prototipo-mapas`)

**Fecha:** 2026-09-11
**Rama de trabajo:** `pruebas-iker`
**Rama fuente del port:** `feature/integrar-prototipo-mapas` (commits `7889b78`, `9b7890d`)

## 1. Contexto

`feature/integrar-prototipo-mapas` no es un incremento sobre este repo: reemplaza todo
el proyecto (Angular + Spring) por un prototipo standalone en HTML/CSS/JS vanilla que
explora un mapa panorámico de scroll vertical, estilo Mario/Donkey Kong, con fondo
temático real por unidad (desierto / selva / castillo).

Este spec cubre **exclusivamente** portar el motor visual de ese mapa —el que se ve al
entrar a una unidad— a la app Angular real, integrado con el dominio y el progreso
reales. Nada más de esa rama se toca: ni los bancos de preguntas, ni el diálogo de
actividad, ni la pantalla de configuración de cantidad, ni el header/HUD superior.

Hoy esa pantalla existe como [`unidad-mapa.ts`](../../../frontend/src/app/features/alumno/unidad-mapa.ts):
un tablero plano SVG estilo Mario 3 (casilleros en serpentina, caminos ortogonales),
con el lenguaje visual "neón" documentado en `path/05-design-system.md`.

## 2. Qué se porta y qué no

**Se porta** (adaptado a TypeScript/Angular, sin las imágenes ilustradas gigantes que
no se usan en el flujo real del prototipo):

| Origen (`feature/integrar-prototipo-mapas`) | Qué aporta |
|---|---|
| `vertical-world.js` (`makeVerticalUnit`, `renderVerticalTerrain`) | Generador procedural de ruta: carriles determinísticos por semilla, curvas bezier entre nodos consecutivos, altura del mundo según cantidad de nodos |
| `world-appearance.js` | Textura tileable + paleta de carriles + arte SVG de la meta (templo/fortaleza/castillo), por tema |
| `node-art.js` | Arte SVG por tipo de nodo y tema (caja/barril/portal), con variantes bloqueado/completado/nodo final |
| `desert-scenery.js` (parcial) | Decorado ambiental determinístico (monedas de rastro, nubes, casas) — solo el tema desierto lo usa; los otros dos temas usan el decorado genérico de `world-appearance.js` |
| 3 imágenes tileables (`mapa_desierto_tile_vertical.png`, `mapa_selva_tile.png`, `mapa_castillo_tile.png`, ~2-3MB c/u) | Fondo de cada mundo |
| Concepto de cámara-sigue-al-avatar + fullscreen | UX de recorrido |

**No se porta** (queda tal cual está hoy, o no se trae en absoluto):

- Bancos de preguntas/desafíos del prototipo (`desert-lessons.js`, `worlds.js`,
  `unit-lessons.js`) — se sigue usando `Actividad`/`RoadmapStore` real.
- Diálogo de actividad, pantalla de configuración de cantidad, sonido, header/HUD
  superior, login, home, editor del profesor.
- Las imágenes ilustradas de referencia (`mapa_desierto_objetos.png`,
  `Castlevania_mapa.png`, `DonkeyKong_mapa.png`, `imagen_referencia.png`, etc.) — no se
  usan en el flujo real del prototipo (`app.js` las sobreescribe con la textura
  tileable al cargar), así que no se copian.
- El nodo sintético "recuperar vida" que el prototipo agrega siempre
  (`unit-lessons.js` lo agrega a mano para todo `count`) — no tiene equivalente en el
  dominio real (`Actividad` no modela recuperación por unidad; eso es un flujo de
  backend aparte, `DesafioRecuperacionEntity`). **No se inventa uno.**

## 3. Mapeo con el dominio real

**Tema por unidad**, por `orden` (no por nombre de contenido, que no coincide 1:1 con
el temario real):

| `orden` | Tema | Origen |
|---|---|---|
| 1 | `desert` | Unidad 1 del prototipo |
| 2 | `jungle` | Unidad 2 del prototipo |
| 3 | `castle` | Unidad 3 del prototipo |
| 4+ | *(sin tema)* | El prototipo no define un 4º mundo — la unidad sigue usando el tablero plano actual, sin regresión visual |

**Tipo de nodo (`TipoNodo`) → posición en la ruta:**

| `tipo` | Rol en el mapa vertical |
|---|---|
| `boss` | Nodo final del recorrido (arte "final" del tema + arte de meta al llegar) |
| `hito` | Nodo bonus en ramal lateral (reusa la técnica de "support road" del prototipo) — solo si la unidad tiene una actividad de este tipo |
| `teoria` / `practica` / `desafio` | Nodos del camino principal, en el orden en que aparecen en `Unidad.actividades` |

El estado visual de cada nodo sigue siendo el `EstadoNodo` real
(`bloqueado`/`habilitado`/`completado`/`fallado`) vía `RoadmapStore` — no cambia la
lógica de progreso, solo el dibujo.

## 4. Arquitectura

```
features/alumno/
  unidad-mapa.ts            (existente, se adelgaza)
  tablero-plano.ts           (nuevo — extrae el render SVG-grid actual, sin cambios de comportamiento)
  mundo-vertical/
    mundo-vertical.ts        (nuevo — componente de presentación del mapa panorámico)
    mundo-ruta.ts            (nuevo — funciones puras: genera stops/roads a partir de actividades + tema)
    mundo-appearance.ts      (nuevo — textura, paleta de carriles, arte de meta y de nodo por tema)
```

- **`UnidadMapa`** (adelgazado): sigue resolviendo la unidad y el progreso reales
  (`RoadmapStore`, `RoadmapDataPort`) como hoy. Calcula `tema(unidad.orden)` y
  renderiza `<app-mundo-vertical>` si hay tema, o `<app-tablero-plano>` si no —
  pasándole a cualquiera de los dos los mismos `casilleros`/`estado`/`progreso` ya
  computados. HUD, ficha de detalle y botón "volver al mapa" quedan en `UnidadMapa`,
  compartidos por ambos renders.
- **`TableroPlano`**: el template SVG-grid que hoy vive en `unidad-mapa.ts`, movido tal
  cual (mismo comportamiento, mismos tests si los hubiera).
- **`MundoVertical`**: contenedor con scroll vertical + fondo tileable (CSS
  `background-image` repetida) + SVG de ruta/decorado por encima + nodos posicionados
  en `%` a lo largo de la curva + `AvatarSprite` (el mismo componente que usa
  `TableroPlano` hoy, no el explorador del prototipo) caminando tramo a tramo sobre la
  curva. Controles: fullscreen (Fullscreen API), "ver meta ↑ / mi personaje / inicio
  ↓" para mover la cámara manualmente.
- **`mundo-ruta.ts`**: puerto de `challengeSpacing`/`makeVerticalUnit`, recibiendo la
  lista de actividades reales (no un `count` arbitrario) y devolviendo
  `{ stops, roads, worldHeight, worldWidth }`. Funciones puras → con tests unitarios
  (determinismo, bordes: 1 actividad, actividad `boss` sola, unidad sin `hito`).
- **`mundo-appearance.ts`**: puerto de `world-appearance.js` + `node-art.js` +
  `desert-scenery.js`, indexado por `Tema = 'desert' | 'jungle' | 'castle'`.

## 5. Cambio en el mapa general — "ver más mapas internos"

Hoy, en [`mapa.ts`](../../../frontend/src/app/features/alumno/mapa.ts), una unidad
bloqueada por XP no tiene forma de entrar: solo muestra "🔒 NECESITÁS X XP MÁS" en la
ficha de detalle (línea 338-341).

**Cambio:** se agrega un botón secundario, siempre disponible aunque la unidad esté
bloqueada:

```
👁 VER MAPA
```

que navega a `/alumno/unidad/:id` igual que "▶ ENTRAR A LA UNIDAD". Esto no cambia
ninguna regla de negocio: adentro, las actividades de una unidad no alcanzada siguen
mostrando estado `bloqueado` real (la progresión secuencial no se toca) — solo permite
mirar el mapa temático de cualquier unidad, no jugarla. El botón "▶ ENTRAR A LA UNIDAD"
existente para unidades desbloqueadas no cambia.

## 6. Assets

Se copian 3 imágenes (`mapa_desierto_tile_vertical.png`, `mapa_selva_tile.png`,
`mapa_castillo_tile.png`) a `frontend/public/mundos/`. Quedan fuera del bundle inicial
porque `mundo-vertical.ts` se carga en el chunk lazy de la ruta
`/alumno/unidad/:id` (igual que hoy).

## 7. Testing

- Tests unitarios nuevos para `mundo-ruta.ts` (puro, sin Angular): determinismo entre
  llamadas, unidad de 1 actividad, unidad con `hito`, unidad sin `hito`.
- Sin cambios de comportamiento esperados en `TableroPlano` (extracción, no reescritura)
  ni en el resto de tests existentes (19 pasan hoy en `pruebas-iker`).
- Verificación manual en navegador: entrar como ALUMNO a las 3 unidades con tema +
  la unidad 4 (sin tema, confirma que no hay regresión) + probar "👁 VER MAPA" en una
  unidad bloqueada.

## 8. Fuera de alcance / deuda técnica a registrar durante la implementación

- Peso de las 3 imágenes tileables (~8MB total, sin optimizar) — candidato a
  comprimir/convertir a WebP más adelante.
- La unidad 4 ("Estructuras de datos") queda sin mapa temático propio porque el
  prototipo no define un 4º mundo — no se inventa uno nuevo sin decisión de
  negocio/diseño confirmada.
- El botón "👁 VER MAPA" no tiene aún un criterio de negocio confirmado más allá de
  "permitir revisar los mapas ya implementados" — si más adelante se decide que
  navegar a una unidad no alcanzada debe estar prohibido para el alumno real (por
  ejemplo, reservarlo a rol PROFESOR/ADMIN para vista previa), es un ajuste de guard,
  no de este componente.
