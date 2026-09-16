# Deuda técnica — `07-islas-3d-desafios.md` (Ronda 6: Espacio + estructuras + vehículos)

Registrada al implementar el bioma Espacio, las estructuras del hub, los vehículos
de fin de ruta y las mascotas GLB.

## 🔴 1. Cálculo real de la racha para el billboard

**Qué falta:** la racha sigue mockeada (`rachaDias = 10`): `mapa.ts` la tiene como
`signal(10)` y `mundo-3d.ts` la reenvía tal cual en `setUnidades`. No hay
fecha/corte/cálculo por actividad completada.

**Dónde vive:** `frontend/src/app/features/alumno/mapa.ts` (`rachaDias`),
`frontend/src/app/features/alumno/mundo-3d.ts` (campo `rachaDias` del postMessage),
`frontend/public/mundo-3d/index.html` (`drawStreakBillboard`).

**Por qué no bloquea la tarea actual:** el billboard ya dibuja el diseño + fuego +
días dinámicamente; cuando el número sea real no hay que tocar el 3D, solo el origen
del dato.

**Cómo se paga:** cuando el backend exponga racha/streak del alumno (o se defina la
mecánica en el grupo), reemplazar el `10` fijo por ese valor.

## 🔴 2. Material teórico real en la pestaña del Templo

**Qué falta:** `/alumno/materiales` muestra secciones y archivos de ejemplo
fijos; no lee de ningún servicio ni del `recursoUrl` de los nodos `teoria`.

**Dónde vive:** `frontend/src/app/features/alumno/materiales.ts`.

**Por qué no bloquea la tarea actual:** el contrato ya quedó fijo (mensaje
`openMateriales` + ruta + navbar de retorno); el contenido de ejemplo alcanza para
validar el flujo del templo.

**Cómo se paga:** cuando los otros grupos publiquen su servicio de contenidos,
reemplazar `SECCIONES_EJEMPLO` por lectura real.

## 🔴 3. Bisagra real puerta/marco para la trampilla

**Qué falta:** el GLB `Trapdoor-dec.glb` trae UNA sola malla (`Trapdoor`, sin marco
separado — verificado por inspección del chunk JSON), así que `toggleTrapdoor`
anima la pieza entera sobre un gozne en su borde en vez de abrir solo la puerta.

**Dónde vive:** `frontend/public/mundo-3d/Assets/Estructuras/Trapdoor-dec.glb`,
`frontend/public/mundo-3d/index.html` (`toggleTrapdoor`).

**Por qué no bloquea la tarea actual:** visualmente se lee como apertura; una
bisagra real exige re-exportar el modelo desde Blender con puerta y marco
separados.

**Cómo se paga:** cuando el equipo 3D re-exporte la trampilla con dos objetos,
cambiar la animación a rotar solo la puerta. Sin trigger claro todavía.

## 🔴 4. Lazy-loading real de islas en el viaje con vehículo

**Qué falta:** la transición (olas/cometa) muestra "cargando" pero las islas ya
están todas construidas en `rebuildCity` (barato por `parsedGLTCache`); no hay
construcción bajo demanda por isla.

**Dónde vive:** `frontend/public/mundo-3d/index.html`
(`startVehicleTransition`, `buildChallengeIsland`).

**Por qué no bloquea la tarea actual:** con 5-6 unidades el costo es el mismo que
ya paga la ciudad; el overlay deja el punto de inserción para la carga real.

**Cómo se paga:** si el número de unidades crece y el rebuild se vuelve pesado,
construir solo la isla destino dentro de la ventana de la transición. Sin trigger
claro todavía.

## 🔴 5. Mascotas GLB en el `AvatarConfig` 2D / Identidad

**Qué falta:** las 5 mascotas GLB (y las 4 procedurales) solo viven en el creador
3D (`select-pet`); `AvatarConfig` (`avatar.models.ts`) no tiene campo `pet` y el
editor 2D no las muestra.

**Dónde vive:** `frontend/src/app/core/avatar/avatar.models.ts`,
`frontend/src/app/features/alumno/avatar-editor.ts`,
`frontend/public/mundo-3d/index.html` (`GLB_PETS`).

**Por qué no bloquea la tarea actual:** replica el estado previo (las mascotas 3D
ya eran solo-3D); el puente visual avatar 2D/3D sigue como estaba.

**Cómo se paga:** en la Fase 3 (integración con Identidad), agregar `pet` al
contrato de avatar con ids estables como el resto del catálogo.

## 🔴 6. Tile estrellado propio para el tema `space` 2D

**Qué falta:** `WORLD_APPEARANCE.space` reusa `/nether_animado.gif` como fondo
porque no existe un tile estrellado; el ticket 2D quedó con fondo oscuro genérico.

**Dónde vive:** `frontend/src/app/features/alumno/vertical-world.engine.ts`
(`WORLD_APPEARANCE.space`).

**Por qué no bloquea la tarea actual:** el mapa 2D de Espacio funciona (colores y
meta propios); solo le falta el fondo temático.

**Cómo se paga:** cuando haya un asset de tile estrellado en `frontend/public/`,
cambiar el campo `tile`. Sin trigger claro todavía.

## 🔴 7. Meta 3D propia para el bioma Arenisca

**Qué falta:** Nieve/Bosque/Desierto/Espacio tienen meta dedicada
(`GOAL_MODEL_BY_BIOME`); Arenisca (y Nether) conservan su casa como meta porque no
llegó ningún GLB para ellas.

**Dónde vive:** `frontend/public/mundo-3d/index.html` (`GOAL_MODEL_BY_BIOME`).

**Por qué no bloquea la tarea actual:** el comportamiento es el anterior (casa
como meta); agregar la meta es sumar una línea al mapa cuando exista el asset.

**Cómo se paga:** cuando el equipo 3D entregue la meta de arenisca, agregarla al
mapa. Sin trigger claro todavía.
