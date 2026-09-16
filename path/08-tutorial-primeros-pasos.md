# Tutorial «Tus primeros pasos»

Implementación de la guía breve aprobada para la vista alumno (RF-CUR-01,
RF-NFR-05). Complementa la exploración del roadmap; no otorga XP ni modifica
vidas, desbloqueos o progreso académico.

## Experiencia y diseño

Tarjeta arcade oscura, borde cian fino, esquina superior recortada, tipografías
existentes y tres segmentos de avance. Ancho de 300 px (280 px hasta 1300 px),
anclada a 20 px del borde inferior izquierdo. La cámara sigue bajo control del
alumno. No hay backdrop, sonido, confeti ni diálogos centrales nuevos.

1. **Probá moverte**: clic en el mundo + WASD, Shift opcional. Avanza al recorrer
   1,5 unidades mediante controles, medidas después de colisiones y límites;
   teletransportes no cuentan.
2. **Entrá a una unidad**: nombre de destino en la tarjeta; aro y etiqueta celestes
   sobre la casa. Avanza al entrar en cualquier unidad con desafíos accesibles.
3. **Abrí un desafío**: señala un desafío accesible. Termina cuando Angular abrió
   efectivamente su contenido, sin exigir responderlo. Al cerrarlo aparece una
   confirmación de cuatro segundos.

`Saltar tutorial` recuerda la omisión. `? Ayuda` permite repetir. La guía reemplaza
temporalmente el cartel de controles, no el prompt de interacción. Se oculta en
personalización, ficha abierta, modales, ranking y viajes. El movimiento se pausa
con overlays y limpia las teclas al perder foco. Transiciones de 200 ms; respeta
`prefers-reduced-motion`, botones con foco visible y anuncios `aria-live=polite`.

## Estado y destinos

- `TutorialState` mantiene `pendiente | activo | omitido | completado`, paso y
  número de intento. Clave local `roadmap.primeros-pasos.v1`. Datos inválidos o
  almacenamiento denegado vuelven a defaults y funcionan en memoria.
- Se habilita solo para ALUMNO, después de cargar datos, mapa y personaje. No
  inicia sobre `about:blank` ni ante errores de carga del personaje/casa destino.
- Las unidades se envían ordenadas por `orden`; los destinos proceden de
  `interactiveModules` con `locked=false`, excluyendo contenido `teoria`. No se
  duplica la regla de disponibilidad. Prioriza pendientes; si no hay, permite
  practicar con completados accesibles.
- Al entrar en otra unidad válida adapta el objetivo. Si está en una isla sin
  destinos pero existen en otra, señala el regreso a la ciudad. La vuelta a la
  ciudad adapta el paso 3 a 2. Abrir un desafío válido fuera de orden también
  completa la guía. Recargar retoma el avance con la ubicación efectiva.
- Sin destinos no inicia automáticamente; Ayuda muestra los controles y explica
  que todavía no hay desafíos disponibles. Rebuilds ocultan temporalmente la guía
  y recalculan el destino al finalizar.
- Persistencia por navegador es la decisión aprobada para esta versión mock,
  no un contrato de identidad del sistema. Ver deuda asociada.

## Integración

La tarjeta y el estado están separados en `frontend/src/app/features/alumno/tutorial/`.
`mundo-3d.ts` orquesta los overlays y la confirmación de apertura. El módulo
`frontend/public/mundo-3d/tutorial-bridge.js` administra el marcador y el puente.

| Dirección | Mensaje | Datos |
|---|---|---|
| Escena → Angular | `tutorialScene` | `ready`, `busy`, `zone`, destinos `{unitId, activityId, unitName, activityName, completed}` |
| Escena → Angular | `tutorialMoved` | `attempt`: se emite una vez por intento tras 1,5 unidades |
| Angular → escena | `tutorialControl` | `visible`, `paused`, `step`, `attempt`, `unitId`, `activityId` |

Snapshots solo al cambiar carga, zona, overlays o revisión del mapa; no posiciones
por fotograma. Ambos lados validan origen, ventana emisora y estructura del nuevo
contrato. `enterActivity` sigue siendo la acción existente; la finalización ocurre
después de que el host haya encontrado y abierto la actividad.

El aro no cambia materiales de los desafíos ni comunica su estado académico.
Geometría, textura y materiales propios se liberan al cambiar destino, ocultarse
o abandonar la escena; la geometría compartida de sprites no se libera.

### Correcciones necesarias durante la integración

- Lecturas de storage del personaje y mapa ahora toleran acceso denegado: antes
  podían abortar toda la escena y hacer imposible el fallback del tutorial.
- Los mensajes del host ahora comprueban emisor/origen también para acciones
  previas, y la escena recibe `setUnidades` solo desde su padre del mismo origen.
- El error de `GLTFLoader.parse` de assets de ciudad pasa como cuarto argumento,
  no quinto; un archivo inválido resuelve el fallback y no deja la promesa colgada.
- Los puntos de regreso incluyen `unitId` para identificar la salida de cada isla.

## Validación

Tests unitarios: carga, selección de destinos, pasos fuera de orden, pausas,
omisión, repetición, persistencia, datos corruptos, storage denegado, rebuilds,
celebración y filtrado de mensajes. Tests de host comprueban ventanas/orígenes
ajenos, payloads inválidos, personalización y vista profesor.

Revisión en Chrome a 1280×720 y 1920×1080: tarjeta sin superposición con el prompt
central ni avatar; recorrido, omisión/reentrada y pausa al abrir actividades.
Compilación de desarrollo y producción, y suite Angular ejecutadas al cerrar
la tarea. Node 24.15.0 temporal por incompatibilidad del Node global 22.20.0.

Resultado: **121 tests / 11 archivos en verde**, build de producción exitoso
(bundle inicial 460,49 kB). El build avisa sobre Samsung 30 fuera de Browserslist
soportado y diez selectores CSS omitidos del procesamiento de estilos. No son
errores de compilación. Chrome también verificó storage completamente denegado,
mapa sin desafíos, fallo de carga del personaje y movimiento reducido.

La cámara inicial cercana a la tienda es preexistente y queda registrada como
deuda visual, fuera del comportamiento de esta guía.
