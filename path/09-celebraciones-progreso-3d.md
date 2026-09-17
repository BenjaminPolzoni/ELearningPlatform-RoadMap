# Celebraciones de progreso en el mundo 3D

## Experiencia

La primera finalización de un desafío, confirmada al continuar, muestra el XP
realmente registrado durante 1,2 segundos junto al personaje, partículas doradas y
un pulso en el nodo. La notificación accesible dura 2,5 segundos y queda por encima
de los controles inferiores; no bloquea movimiento ni cambia la cámara.

Cuando una unidad pasa a resuelta, el aviso incluye su nombre. Su entrada en la
ciudad recibe un medallón dorado con un tilde. Se mantiene la regla existente:
completar todas las obligatorias, con al menos una obligatoria. El medallón se
reconstruye desde el progreso, sin almacenamiento adicional.

Repetir no otorga ni anuncia XP adicional. Teoría y recuperación conservan su flujo
y no disparan estos efectos. El sonido de acierto existente no se duplica.
Con movimiento reducido quedan texto y marca estática, sin partículas ni pulsos.
El aviso final del tutorial espera a que termine la recompensa.

## Guardado y contrato interno

`RoadmapStore.sumarProgreso` acepta callbacks opcionales de confirmación (con el
`Progreso` devuelto por el puerto) y error. El host bloquea doble envío y cierre
durante el guardado; un error conserva el desafío para reintentar. La recompensa
usa la diferencia entre XP confirmado y previo. No cambian APIs del backend.

Angular envía al iframe `celebrateProgress`: `id` único, `unitId`, `activityId`,
`xp`, `unitCompleted`, `unitName`. El iframe valida origen y ventana padre, tipos
y XP finito no negativo. Ignora duplicados y espera mapa listo, ausencia de modal,
zona correcta y actividad marcada completada. Así no anima el nodo antiguo antes
de que llegue `setUnidades` ni durante la reconstrucción asíncrona.

Al iniciar responde `celebrationStarted` con el mismo `id`; el host comprueba
origen, ventana e identificador. Si no responde en 3 segundos, Angular muestra
igualmente la recompensa. El efecto pendiente vence antes de ese fallback.
Ni la carga inicial ni la recarga generan efectos transitorios.

`progress-celebration.js` administra sus recursos y usa el bucle de animación
existente. Libera texturas, materiales y geometrías propias al terminar, cambiar
de zona o destruir la escena; no libera geometría compartida de sprites.

## Correcciones relacionadas

- El éxito previo al guardado dice «Recompensa al continuar», no «obtenida».
- Repeticiones muestran práctica completada sin XP ficticio.
- El contador de unidad excluye teoría, que no otorga XP.
- Actividades antiguas sin dificultad usan BASICO (100 XP), igual que el contador;
  antes el desafío otorgaba 50 mientras la ficha contabilizaba 100.

## Validación

Tests del host: confirmación diferida, doble clic, error/reintento, diferencia de
XP confirmada, repetición, unidad sin obligatorias, teoría/recuperación, fallback
y seguridad/idempotencia del acuse del iframe. Validación del 16/09/2026:
128 tests en 12 archivos y build de producción en verde. Persisten los avisos
previos de Browserslist y selectores CSS de dependencias.
Pruebas de navegador: completar desafíos y unidad, encuadre desktop, restauración
del medallón al recargar sin repetir efectos, y movimiento reducido. El puente
también se probó con escena no lista, mensaje de ventana incorrecta, duplicados
y eliminación de sus objetos al disponerlo. Sin errores JavaScript en la sesión.

El progreso sigue siendo el mock local existente. No se agregan modelos GLB,
dependencias, recompensas, reglas de desbloqueo ni persistencia de backend.
