# Islas 3D de Desafíos por Unidad — estado y handoff

> Rama: `modelo-3d-integracion`. Este documento resume lo implementado en esta sesión
> para poder continuar en otra sin tener que re-derivar el contexto. El plan original
> completo (contexto, hallazgos de exploración, decisiones) quedó guardado también en
> `C:\Users\ludmi\.claude\plans\expressive-honking-bunny.md` (fuera del repo).

## Pedido original

> "quiero que te bases en el mundo 2d/bioma de nieve que se ve dentro de la unidad
> (donde está el camino y los desafíos), y esa isla que creamos recién ahora sea el
> mundo 3D de los desafíos. Usa Three.js para el suelo donde se pone la estructura y
> assets modelados en Blender."

Decisiones confirmadas por el usuario antes de implementar:
- **Totalmente jugable** (no solo decorativo): tocar un nodo en 3D resuelve el
  desafío de verdad, con el mismo XP/vidas que hoy.
- **Todos los biomas**, no solo Nieve.
- El botón **"Acceder al Módulo" teletransporta** dentro del mismo mundo 3D (no
  navega a otra ruta Angular).

## Qué cambió

### `frontend/public/mundo-3d/index.html`

- **`stageUnit(...)` / `units[]`**: ahora recibe y guarda `actividades` (id, nombre,
  tipo, dificultad, descripción, `completada`) por unidad, mandadas desde Angular en
  el mensaje `setUnidades`.
- **`ISLAND_TINTS` + `getIslandMatsForBiome(biomeKey)`**: variantes de arena/roca
  clonadas y recoloreadas por bioma (Nieve sale blanquecina/helada, Nether oscura,
  etc.), cacheadas para no clonar materiales en cada rebuild.
- **`buildOceanIsland(minX, maxX, minZ, maxZ, mats)`**: ahora acepta un 5º parámetro
  opcional `mats` (si se omite, usa los materiales globales de siempre — la isla
  principal de la ciudad no cambió). Además ahora **devuelve** el `islandGroup`.
- **`layoutChallengeNodes3D(actividades, minX, maxX, minZ, maxZ)`**: calcula la
  posición 3D de cada nodo de desafío dentro de la isla (avanza en +X, alterna
  "carril" en Z) — versión 3D simplificada del algoritmo de zigzag de
  `vertical-world.engine.ts` (2D).
- **`buildChallengePathStrips(group, points, mat)`**: dibuja el camino en escuadra
  (sin curvas) que conecta entrada → nodos → estructura meta.
- **`createChallengeNodeBillboard(...)` / `createChallengeNodeMarker(node, estado)`**:
  cartel canvas-texture + pedestal por nodo, coloreado por estado
  (bloqueado=gris, disponible=cian, completado=dorado).
- **`buildChallengeIsland(unit, minX, maxX, estados)`**: la función que arma TODO —
  terreno tintado, camino, nodos (con `interactiveModules` tipo `'challenge'`),
  decoración lateral (reusa `tree-small`/`tree-large`/`planter` ya usados en la
  ciudad + `path-stones-short/long.glb`, Blender, antes sin usar), y la
  **estructura meta** = el mismo GLB de casa por bioma que ya usa la ciudad
  (`Assets/House/<Bioma>/...glb`), escalado con el mismo patrón Box3 ya existente.
  También registra un módulo `'returnCity'` en el punto de entrada de la isla.
- **`rebuildCity()`**: el bloque hardcodeado de "segunda isla vacía" se reemplazó por
  un loop sobre `units` que llama `buildChallengeIsland` una vez por unidad,
  colocando las islas en fila al este de la ciudad (separadas por 6m de mar
  abierto). Se reconstruyen enteras en cada `rebuildCity()` (igual que las casas de
  la avenida), así que el estado de los nodos siempre queda al día solo.
- **Teletransporte**: `teleportPlayerTo(x, z, angulo)` (nueva) + `currentZone`
  (nueva variable de estado: `'city'` o el `unitId` de la isla donde está parado el
  jugador). El botón "Acceder al Módulo" ("Resolver Desafío" / "Volver a la Ciudad"
  según el módulo cercano) ya NO manda `enterUnit` a Angular — teletransporta
  directo dentro del iframe. El clamp de movimiento por frame ahora respeta
  `currentZone` (límites de la isla en vez de la avenida cuando corresponde).
- **Mensaje saliente nuevo**: al tocar "Resolver Desafío" en un nodo disponible,
  manda `window.parent.postMessage({type:'enterActivity', unitId, actividadId})`.
- **Mensaje `enterUnit` (saliente, viejo)**: eliminado — ya no se usa.
- **Aislamiento visual por isla** (fix pedido después de la primera prueba visual del
  usuario: "no las 5 enteras en fila, solo la isla... y que no aparezcan las demás"):
  - Todo lo de una isla de desafíos (terreno + camino + nodos + decoración +
    estructura) ahora cuelga de un único grupo `islandRoot`, guardado en
    `challengeIslandGroups[unit.unitId]`, oculto por defecto (`.visible = false`).
  - `showOnlyChallengeIsland(unitId)` (nueva): muestra solo la isla de `unitId` y
    oculta el resto — incluida la **ciudad principal completa** (isla central,
    casas, tienda, trofeo, nubes: todo lo que cuelga directo de `cityGroup` y no es
    una isla de desafíos), cuando `unitId` no es `null`. Con `unitId === null` es al
    revés: se ve la ciudad y ninguna isla de desafíos.
  - Se llama: al teletransportarse a una unidad (`showOnlyChallengeIsland(unitId)`),
    al volver a la ciudad o salir del creador de personaje
    (`showOnlyChallengeIsland(null)`), y de nuevo al final de cada `rebuildCity()`
    respetando `currentZone` — así un rebuild automático (p.ej. al sumar XP estando
    parado en una isla) no vuelve a mostrar todo.
- **Fix "isla hundida" (sin suelo)**: `buildOceanIsland` solo dibuja playas en el
  borde + roca de base por debajo — nunca cubría el interior de la isla, así que se
  veía el mar/roca del fondo a través. Se agregó una plataforma sólida
  (`islandGround`, `BoxGeometry` del ancho/profundidad total de la isla) dentro de
  `buildChallengeIsland`, con color `BIOMES[unit.biome].groundColor` (el mismo mapa
  de colores por bioma que ya usa el suelo de cada lote de la avenida) — mismo
  patrón que `lotMesh` en el loop de casas de `rebuildCity()`.

### `frontend/src/app/features/alumno/mundo-3d.ts`

- Ya no navega de ruta: el listener de mensajes ahora escucha `enterActivity` (antes
  escuchaba `enterUnit` y hacía `router.navigate(['/alumno/unidad', unitId])`).
- El efecto `sincronizarEstado` (el que manda `setUnidades` al iframe) ahora también
  manda `actividades` por unidad (id, nombre, tipo, dificultad, descripción,
  `completada`) — antes solo mandaba el resumen (`resuelta`, `xpUnidad`, etc.).
- **Se portó el modal de quiz completo** desde `unidad-mapa.ts` (2D) como overlay
  Angular encima del `<iframe>` persistente: mismo template (pregunta, opciones A-D,
  feedback de error, pantalla de recompensa), mismos métodos
  (`currentQuestion`, `checkAnswer`, `onCompleteActivity`, `closeActivity`,
  `playAudioTone`, `isCompleted`).
- `abrirDesafio(unitId, actividadId)` (nuevo): resuelve la `Unidad` vía
  `store.unidadPorId`, arma `baseChallenges` igual que hace `unidad-mapa.ts`, llama
  `generateVerticalWorld(theme, baseChallenges)` (reusa la función pura del 2D,
  **sin tocarla**) para obtener las mismas preguntas/XP que vería el mapa 2D, y abre
  el modal.
- Al completar una actividad se sigue llamando `store.sumarProgreso(...)` exactamente
  igual que en 2D — la persistencia (localStorage `progreso-mock-v2-alu-01`) no
  cambió. Como `sumarProgreso` muta `store.progreso()`, el mismo efecto
  `sincronizarEstado` se vuelve a disparar solo y le manda a la isla 3D el estado
  actualizado (no hizo falta un mensaje de "actividad completada" aparte).

### Lo que NO se tocó

- `frontend/src/app/features/alumno/unidad-mapa.ts` (mapa 2D) y su ruta
  `/alumno/unidad/:id`: siguen existiendo intactos, ya no son el destino de
  "Acceder al Módulo" pero son accesibles por URL directa si hiciera falta.
- `vertical-world.engine.ts`: sin cambios, se reusa tal cual (`generateVerticalWorld`,
  `BIOMA_A_WORLD_THEME`) tanto desde 2D como desde el nuevo `mundo-3d.ts`.

## Alcance de esta v1 (deliberadamente no incluido)

- **Nodos opcionales (bonus / recuperación de vida)** del mapa 2D no se portaron a
  3D — el camino 3D solo tiene los desafíos principales, secuenciales. Fast-follow
  pendiente si se quiere paridad completa con 2D.
- **Sin raycasting**: la interacción con los nodos usa el mismo sistema de
  proximidad (caminar cerca → aparece el botón) que ya usa toda la ciudad para las
  casas/tienda/trofeo — no hay click directo sobre el objeto 3D.
- **Sin animación de "caminar automático" al siguiente nodo** tras completar un
  desafío: como los nodos de una unidad están todos cerca entre sí en una isla
  chica, el jugador los alcanza caminando normal con WASD.
- Las islas se **reconstruyen enteras** en cada cambio de progreso (mismo costo que
  ya pagan las casas de la ciudad gracias al caché `parsedGLTCache`) — no hay
  lazy-loading por unidad.

## Verificado en esta sesión

- `node --check` sobre el script del `index.html` extraído — sin errores de sintaxis.
- `ng build` — compila limpio (chunk `mundo-3d` generado sin warnings nuevos).
- `ng test --watch=false` — 106/106 tests pasan (sin regresiones).
- **Prueba visual manual en el navegador** (con un hook de debug temporal, ya
  removido antes de este commit): se confirmó que las 5 islas se construyen con los
  límites esperados; se navegó a la isla de la unidad Nieve (`u4`, 6 actividades) y
  se vio el terreno tintado, el camino en escuadra, los 6 nodos con estado correcto
  (nodo 1 "¡DISPONIBLE!", el resto "BLOQUEADO"), la estructura meta (iglú) y la
  decoración lateral; se probó el flujo completo tocando "Resolver Desafío" en el
  nodo 1 → se abrió el modal de quiz de Angular sobre el iframe con una pregunta
  real generada por `generateVerticalWorld` para el tema `snow`.
- **No se probó todavía (con verificación propia)**: completar un desafío de punta a
  punta (ver que `store.sumarProgreso` persista y que el nodo pase a "COMPLETADO"
  visualmente tras el rebuild), ni el botón "Volver a la Ciudad", ni longevidad del
  flujo con vidas en 0.

### Ronda 2: feedback del usuario probando en vivo

El usuario probó manualmente (no yo — a partir de acá me pidió no verificar más
visualmente y probarlo él mismo) y reportó dos bugs, ya corregidos:
1. *"que aparezca esa isla y nada más, no las 5 enteras en fila... que no aparezcan
   las demás en el mapa"* → resuelto con `showOnlyChallengeIsland` (ver arriba).
2. *"agregale suelo a las islas, pareciera que están hundidas en el mar no tienen
   suelo"* → resuelto con la plataforma `islandGround` (ver arriba), coloreada según
   el bioma (desierto/nieve/bosque/etc., pedido explícito de que siguiera la
   temática).
3. *"cuando entre a una unidad que no me deje ver la isla central de las
   unidades"* → mismo fix de `showOnlyChallengeIsland`, extendido para ocultar
   también la ciudad principal (no solo las otras islas) al entrar a una unidad.

Estos tres fixes están aplicados y pasan `node --check`, pero **todavía no fueron
confirmados visualmente por nadie** desde que se aplicaron (el usuario iba a probar
él mismo). Si se retoma esto en otra sesión, arrancar confirmando que:
- Desde la ciudad no se ve ninguna isla de desafíos.
- Al entrar a una unidad, se ve SOLO su isla (ni las otras islas ni la ciudad).
- El suelo de la isla ya no se ve "hundido" y respeta el color del bioma.

### Ronda 3: el fix de `showOnlyChallengeIsland` no alcanzaba (bug de re-entrancia)

El usuario probó y confirmó: entrando a una unidad, las demás islas SÍ quedaban
ocultas correctamente — pero parado en la isla central (ciudad) igual se veían
las islas de desafíos. La lógica de `showOnlyChallengeIsland` en sí es correcta
(revisada línea por línea), así que el bug no estaba ahí.

**Causa real**: `rebuildCity()` es `async` (carga GLBs por unidad, muchos `await`
repartidos en toda la función) y se dispara desde varios lugares sin coordinación:
`loadUnitsFromStorage()` al bootear el iframe + el primer `setUnidades` real que
manda Angular casi inmediatamente después. Si la segunda llamada arranca mientras
la primera todavía está a mitad de camino (esperando GLBs), la segunda hace su
`while (cityGroup.children.length > 0) cityGroup.remove(...)` y resetea
`challengeIslandGroups = {}` — pero la PRIMERA llamada, al reanudarse después de
sus `await` pendientes, sigue agregando islas a `cityGroup` y escribiendo en el
`challengeIslandGroups` (ya reemplazado) de la segunda. Esas islas "huérfanas" de
la llamada vieja quedan como hijas de `cityGroup` pero NUNCA entran al diccionario
que usa `showOnlyChallengeIsland` para reconocerlas como isla de desafíos — así que
el `forEach` las trata como "ciudad principal" y les pone `visible = true` cada vez
que se llama con `unitId === null`. Por eso el bug solo se notaba parado en la
ciudad: al entrar a una unidad, TODO lo que no es la isla activa se oculta sin
importar si está o no en el diccionario, así que la isla huérfana también se
ocultaba ahí (falso positivo de "está arreglado").

**Fix** (`frontend/public/mundo-3d/index.html`): token de re-entrancia para
`rebuildCity()`.
- `let rebuildToken = 0;` (variable de estado nueva, junto a `currentZone`).
- Cada llamada a `rebuildCity()` toma `const myRebuildToken = ++rebuildToken;` al
  entrar.
- Se agregaron chequeos `if (myRebuildToken !== rebuildToken) return;` al principio
  de cada iteración de los dos loops largos con `await` por unidad (casas de la
  avenida y islas de desafíos) y una vez más antes de `showOnlyChallengeIsland(...)`
  / construir el Trofeo — así una llamada vieja se aborta apenas deja de ser la más
  reciente, en vez de seguir mutando `cityGroup`/`challengeIslandGroups` a ciegas.
- Verificado con `node --check` sobre el script extraído (sin errores). **Falta
  confirmación visual del usuario** (memoria de sesión: la validación visual es
  tarea del usuario, no se abrió navegador para esto).

## Ronda 4: kiosko de Ranking 3D junto al Trofeo

Pedido: "quiero que diseñes un asset 3d para ver el ranking en el mundo 3d al
lado del trofeo". Ya existía un `RankingPanel` completo en Angular (gabinete
arcade neón: `frontend/src/app/features/ranking/ranking-panel.ts`, ya usado en
el mapa 2D `mapa.ts`) — no había que rehacer el ranking, solo darle una entrada
temática desde el mundo 3D.

- **`frontend/public/mundo-3d/index.html`**:
  - `createRankingScreenTexture()` + `buildRankingKiosk(x, z)` (nuevas, cerca de
    `createChallengeNodeMarker`): cabina arcade bajo poli 100% procedural (sin GLB
    de Blender — mismo patrón que la plaza/camino del Trofeo, que también son
    primitivas de Three.js), con pantalla canvas-texture (paleta `--rk-*` del
    panel real: violeta `#8b5cf6`, magenta `#f43f5e`, dorado `#f59e0b`),
    marquesina con luz emissive, joystick y 2 botones, y el mismo cartel
    `createNameBillboard` que usan el Trofeo y las casas.
  - Se agrega en `rebuildCity()` justo después del Trofeo, en `(podioX, 2.6)`
    (mismo lote/plaza, corrido al sur para no pisar el camino de tierra ni el
    colisionador del trofeo) — con su propio `buildingColliders` y un
    `interactiveModules` de `type: 'ranking'`.
  - Al tocar "Ver Ranking" en proximidad (`btnAccessModule`, label agregado en
    `checkProximityToModules`), el mundo 3D NO abre nada él mismo: manda
    `window.parent.postMessage({ type: 'openRanking' }, '*')` — mismo patrón que
    `enterActivity` para el modal de quiz.
- **`frontend/src/app/features/alumno/mundo-3d.ts`**: escucha `openRanking`
  (`esMensajeOpenRanking`), signal `rankingOpen`, y monta
  `<app-ranking-panel (cerrar)="rankingOpen.set(false)" />` como overlay sobre el
  iframe — el mismo componente que usa el mapa 2D, sin duplicar lógica de datos.

Verificado en esta sesión: `ng build` compila limpio (chunk `mundo-3d` sin
errores) y `ng test --watch=false` — 106/106 pasan. **No probado visualmente**
(tarea del usuario): falta confirmar que el kiosko se vea bien parado junto al
Trofeo (escala, que no se superponga con el camino/colisionador) y que
"Ver Ranking" abra el panel correcto.

## Ronda 5: podio holográfico (reemplaza al kiosko) + XP real en el Ranking

Pedido: "hagamos el podio, dejalo lo más 3D que puedas, usa Three.js, assets de
alguna página lo que sea" — reemplaza el kiosko arcade 100% procedural de la
Ronda 4 por un asset GLB real ya existente en el proyecto (nunca llegó a
usarse) más una pantalla holográfica.

- **`frontend/public/mundo-3d/index.html`**: `buildRankingKiosk`/
  `createRankingScreenTexture` (Ronda 4) → `buildRankingPodium(x, z)` (async) +
  `createRankingHoloTexture()`.
  - Carga `Assets/House/Podio/podio_estandartes_minecraft_low_poly (1).glb` con
    `loadCityAssetGLB`, mismo patrón de auto-escalado/centrado que el Trofeo
    Dorado (`Assets/House/Podio/trofeo_dorado_minecraft_low_poly.glb`).
  - Pantalla holográfica flotante (canvas-texture, 680×640, con respaldo opaco
    detrás: las esquinas redondeadas del canvas son transparentes y sin ese
    respaldo el mar del fondo se "comía" el contraste del texto), anillo
    proyector cian y partículas ascendentes violeta→cian entre el anillo y la
    pantalla — todo animado reusando `activeRGBObjects`/`userData.updateRGB`
    (el mismo mecanismo del teclado/mouse gamer RGB), sin tocar `animate()`.
  - Fila de XP junto a cada nombre enmascarado en la pantalla (ej. "2.450 XP"),
    decorativo — el dato real lo sigue mostrando el `RankingPanel` de Angular.
  - Varias rondas de ajuste fino a ciegas (altura del conjunto respecto a la
    altura total del modelo —los mástiles de los estandartes dominaban el
    bounding box—, orientación de la pantalla, separación pantalla/aro, tamaño
    del aro corrido hacia atrás en vez de achicado): **ninguno verificado
    visualmente**, todo a partir de la descripción del usuario en cada vuelta.
- **`frontend/src/app/core/data/in-memory-ranking.adapter.ts`**: bug real
  (no cosmético) encontrado al revisar el pedido — completar un ejercicio nunca
  movía el XP del ranking porque `InMemoryRankingAdapter` leía un fixture 100%
  fijo (`ranking.seed.ts`, a propósito: "el ranking no debe bailar entre
  cargas") sin ninguna conexión al `Progreso` real que sí actualiza el HUD/mapa
  (`in-memory-roadmap.adapter.ts`). Fix (confirmado con el usuario antes de
  tocarlo): inyecta `RoadmapDataPort` y pisa XP/nivel de la fila de `alu-01` con
  el `Progreso` en vivo antes de reordenar la cohorte (`ordenarCohorte` +
  `percentilDe` + `zonaDe`); el resto de la cohorte sigue siendo el fixture
  fijo. Como el panel lee esto con `toSignal(...)`, debería reflejarse incluso
  con el panel ya abierto.
- **`frontend/src/app/core/data/in-memory-ranking.adapter.spec.ts`**: agrega el
  provider de `RoadmapDataPort` (nueva dependencia del adapter).

Verificado en esta sesión: tests de `in-memory-ranking.adapter.spec.ts` +
`domain/ranking/*.spec.ts` (17/17) y `tsc --noEmit` limpios. **No probado
visualmente** (tarea del usuario).


## Archivos tocados

- `frontend/public/mundo-3d/index.html`
- `frontend/src/app/features/alumno/mundo-3d.ts`
- `frontend/src/app/core/data/in-memory-ranking.adapter.ts`
- `frontend/src/app/core/data/in-memory-ranking.adapter.spec.ts`

## Ronda 6: bioma Espacio + estructuras + vehículos + mascotas GLB

32 GLBs movidos de `~/Downloads` a `frontend/public/mundo-3d/Assets/` (ver árbol en
el plan): `Estructuras/` (gazebo, billboard, templo, trampilla), `Decoracion/`
(bancos), `Mascotas/` (5 pets), `Vehiculos/` (bote + nave), `House/Espacio/`
(lander = casa de la unidad espacial en el hub), `Espacio/Nodos/` (10 planetas),
`Espacio/Decoracion/` (nave, ovni, cometa, asteroides, sonda).

- **Metas por bioma** (`GOAL_MODEL_BY_BIOME` en `buildChallengeIsland`): Nieve→iglú,
  Bosque→templo maya, Desierto→pirámide, Espacio→sonda; el resto conserva su casa.
- **Hub**: gazebo del ranking (tabla holo flotante, reusa `openRanking`), billboard
  de racha dinámico (fondo + fuego + días, `drawStreakBillboard`, mock `rachaDias=10`
  vía `setUnidades`), templo (nuevo mensaje `openMateriales` → ruta
  `/alumno/materiales`, mock estático en secciones), trampilla (gozne animado; el
  GLB trae UNA sola malla `Trapdoor`, sin marco separado — verificado por
  inspección — así que la apertura anima la pieza entera), bancos decorativos.
- **Vehículos** al final de cada ruta, pasando la meta: bote (olas) en islas
  clásicas, nave (cometa) en órbita; viajan a la siguiente unidad con overlay de
  "cargando" (los GLB ya están en `parsedGLTCache`).
- **Espacio** (`Bioma` nuevo, elegible en el editor; seed u5 `Concurrencia y Redes`
  ahora es Espacio; enum OpenAPI actualizado): sin isla/agua/nubes — plataforma
  oscura + `Points` de estrellas; nodos = planetas con aro de estado; decor flotante;
  `setSpaceMode` oculta el avatar y muestra la nave con el mismo control, y lo
  restaura intacto al salir (también tras recargar el outfit).
- **Mascotas GLB** (perro, libélula, pez, rana, salamandra) en el selector del
  creador + `cosmetics.js` + `avatar-preview.html`; orbitan igual que las
  procedurales. No entraron a `AvatarConfig` 2D (solo 3D, como las existentes).
- **2D**: `WorldTheme 'space'` + `WORLD_APPEARANCE.space` (tile oscuro reusado) +
  arte de meta `spaceGoalArt`; heurísticas de `unidad-mapa.ts`/`mundo-3d.ts`
  reconocen espacio/orbital/planeta.

Verificado en esta sesión: `node --check` de los 3 scripts (index, preview,
cosmetics) limpio. **No probado visualmente** (tarea del usuario).

## Ronda 7: mascotas voladoras vs. de tierra

Las GLB nuevas no vuelan: el selector del creador se partió en dos `<optgroup>`
(🛸 Voladoras: dron/búho/murciélago/fantasma/libélula/pez — orbitan; 🐾 De tierra:
perro/rana/salamandra — siguen caminando en un slot local del `playerGroup` con
`updateGroundPet`, así heredan movimiento, teletransportes y modo nave). El
comportamiento viaja en `userData.behavior`; espejado en `avatar-preview.html` y
`cosmetics.js` (ahí el catálogo suma `mode` por entrada). Sección retitulada a
"🐾 Mascota" con caption explicativa.

Verificado: `node --check` ×3, `tsc`, 106/106 tests. **No probado visualmente**
(tarea del usuario; revisar escala/altura de pies de perro/rana/salamandra).

## Ronda 8: resize de mascotas + reubicaciones + colisiones + vacío espacial

- **Mascotas normalizadas**: `fitPetToSize` (Box3 real → tamaño objetivo) en los 3
  archivos — el pez traía escala ×100 en su JSON y el `0.5` fijo las agrandaba a
  todas. Objetivos: voladoras 0.35, perro 0.5, rana 0.35, salamandra 0.4.
- **Gazebo retirado** (modelo, holo, módulo y colisionador); el ranking queda solo
  en el podio del Trofeo.
- **Templo como arco de paso** en `(podioX−2.2, 0)` sobre el camino ceremonial, sin
  colisionador; **trampilla + billboard al lote-parque junto a Nieve** (con fallback
  a la plaza ceremonial si el nº de unidades es par). Trampilla y templo caminables
  por decisión del usuario.
- **Colisiones desde la geometría real** (`addColliderFor` con Box3 post-transform):
  tienda, casas, trofeo, podio, billboard, bancos, cercos, macetas/árboles sueltos,
  meta, vehículo, planetas y rocas bajas de órbita. La decoración de lote vive
  dentro de la caja de su casa a propósito. `claimSpot` grita en consola si un
  emplazamiento pisa otro colisionador; `auditOverlaps()` audita pares al final de
  cada `rebuildCity` (excluye casas por lo anterior).
- **Trampilla que sí cierra**: `setTrapdoor` nul-safe con animación cancelable,
  resync en rebuilds, auto-cierre al alejarse/cambiar de módulo y botón con estado
  (Abrir/Cerrar).
- **Órbita = vacío**: plataforma eliminada (el clamp de la isla acota el
  movimiento), planetas reajustados a Ø1.0 centrados en el aro (r=0.72, estilo
  Saturno), camino y losas reemplazados por `buildStarTrail` (puntitos), decoración
  en 3 capas (cerca/medio/lejos, 12 piezas), estrellas 500→900 más grandes y
  `updateZoneSky` (negro-azulado `0x030612` en órbita, celeste restaurado al salir,
  también tras rebuilds por XP) + luz violeta tenue por isla.

Verificado: `node --check` ×3, `tsc`, 106/106 tests, `ng build` OK. **No probado
visualmente** (tarea del usuario).

## Ronda 9: ajustes visuales espaciales + agujero negro + barco 5× + pez suelo

- **Anillos O de planetas translúcidos y debajo**: el aro (TorusGeometry r=0.72)
  baja 0.55 unidades debajo del planeta y gana `transparent: true, opacity: 0.55`.
  El planeta se centra 0.28 unidades más arriba para quedar "dentro del aro" estilo
  Saturno sin tocarlo. Colisionador de planetas reducido (`pad: -0.6`) para permitir
  acercarse más.
- **Estrellas 360°**: `buildStarfield` ahora distribuye 1400 puntos en una cáscara
  esférica (R=70) usando distribución uniforme esférica (θ, φ) en vez de un prisma
  cúbico — el jugador ve estrellas en todas las direcciones.
- **Agujero negro como meta de órbita**: el vehículo al final de la ruta espacial
  cambia de `Spaceship-veh.glb` a `Blackhole-dec.glb` (movido desde `~/Downloads` a
  `Assets/Espacio/Decoracion/`). Escala 2.5, centrado por bbox, sin colisionador
  circular grande. El ícono del interactivo cambia a 🕳️.
- **Barco 5× en agua**: en biomas clásicos el `Ship-veh.glb` se escala ×5 y se
  ubica en el agua al lado de la isla `(vehicleX+3.5, -0.6, 3.8)`, pero el
  colisionador/interacción se queda en la posición original de la isla para que el
  jugador no tenga que ir al agua.
- **Más decoración espacial**: `spaceDeco` crece de 12 a 21 entradas — asteroids
  bajos (4 nuevos cerca del camino), Spaceprobe-dec reemplaza spaceship-dec en la
  capa cercana (2 sondas), cometas lejanos adicionales (3 más en mediano/alto
  alcance), asteroids flotantes lejanos (2 más).
- **Pez en el suelo**: `fitPetToSize` ahora traslada la mascota hacia arriba para
  que su bbox min.y quede en 0 después de escalar — corrige el bug donde Fish-pet
  (con ×100 en su JSON) quedaba abaixo del piso.
- **Panel de perfil más ancho**: `.ui-panel` crece de 216px a 280px, avatar frame
  de 54px a 72px, drawer handle shift de 244px a 308px.

Verificado: `node --check` ×3, `tsc`, 106/106 tests, `ng build` OK. **No probado
visualmente** (tarea del usuario).
