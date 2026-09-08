# Deuda técnica — descubierta ejecutando `06-contrato-api.md`

## 🔴 1. `AlumnoPerfilCacheEntity` posiblemente redundante

**Qué falta:** decidir si esta entidad se elimina, ahora que el BFF (no nuestro) es
quien enriquece las respuestas con avatar/nombre/legajo, o si se conserva con otro
propósito (ej. el anonimato de filas ajenas del ranking, RF-RNK-07).

**Dónde vive:** `backend/ms-roadmap/.../infrastructure/persistence/entity/AlumnoPerfilCacheEntity.java`
— javadoc con la alerta explícita, y la tabla ya existe en `V1__init_schema.sql`.

**Por qué no bloquea la tarea actual:** no la usa ningún flujo implementado todavía —
tenerla de más no rompe nada, solo es una tabla sin lectores/escritores por ahora.

**Cómo se paga:** es una decisión de **equipo**, no técnica — llevarla a la próxima
sesión de integración. Si se elimina, es un `DROP TABLE` en una migración nueva (nunca
editar `V1` a esta altura si ya se compartió con el equipo).

---

## 🔴 2. `DesafioCompletadoEventDto` es una hipótesis de contrato, no confirmada

**Qué falta:** validar la forma real del evento (campos, nombre del tópico) con el
Grupo 9 (Motor de Desafíos, quien lo publica) y con el Tema 11 (dueño del contrato de
eventos de toda la plataforma).

**Dónde vive:** `backend/ms-roadmap/.../infrastructure/messaging/dto/DesafioCompletadoEventDto.java`
y la property `app.kafka.topics.desafio-completado` en `application.yml`.

**Por qué no bloquea la tarea actual:** el use case y el listener están escritos contra
una interfaz clara (el DTO), así que cuando el contrato real aparezca, el cambio se
limita a este archivo y al mapeo en `DesafioCompletadoListener` — el dominio
(`ProcesarDesafioCompletadoCommand` en adelante) no se entera.

**Cómo se paga:** en la sesión de integración con Grupo 9 / Tema 11. Hasta entonces, se
sigue desarrollando y testeando contra esta hipótesis.

---

## 🟢 3. ~~`spring.json.value.default.type` fuerza un único tipo de evento~~

**Qué faltaba:** cuando se sumen más eventos a escuchar (`CursoArchivadoEvent`,
`ScoreIAApeladoEvent`), la `ConsumerFactory` autoconfigurada no iba a poder deserializar
más de un tipo — hacía falta un `ConsumerFactory`/`containerFactory` propio por tipo de
evento.

**Dónde vivía:** comentario `TODO` en `backend/ms-roadmap/.../application.yml`, sección
`spring.kafka.consumer.properties`.

**Pagada:** al implementar `RecuperacionCompletadaListener` (Camino 3, recuperación de
vida) — el segundo consumidor real que necesitó su propio tipo. Se resolvió con
`infrastructure/config/KafkaConsumerConfig.java`, que define un `ConsumerFactory` y un
`ConcurrentKafkaListenerContainerFactory` nombrado (`recuperacionKafkaListenerContainerFactory`)
específico para `RecuperacionCompletadaEventDto`, sin tocar la factory autoconfigurada
que sigue sirviendo a `DesafioCompletadoListener`. El mismo patrón aplica para
`CursoArchivadoEvent` cuando se implemente el Camino 6.

---

## 🔴 4. Chequeo de rol con warning en vez de 403 duro

**Qué falta:** `RoadmapController` debería devolver **403** si falta el header
`X-User-Roles` verificado por el Gateway, en vez de dejar pasar la request con un log de
advertencia.

**Dónde vive:** `backend/ms-roadmap/.../infrastructure/rest/RoadmapController.java`,
método `exigirRolProfesor` — `TODO Fase 1` explícito.

**Por qué no bloquea la tarea actual:** en desarrollo local, sin el Gateway real
integrado todavía, ese header nunca llega — endurecerlo ahora bloquearía cualquier
prueba manual o test de integración local. Es una concesión temporal y documentada, no
un descuido.

**Cómo se paga:** en cuanto el Gateway real (Tema 01) esté integrado en el ambiente de
desarrollo del equipo, cambiar el `log.warn` + `return` por la excepción 403 directa.

---

## 🔴 5. `GET /roadmaps/{cc}` no tiene la vista de ALUMNO filtrada por progreso

**Qué falta:** el contrato §1 dice que `GET /roadmaps/{cc}` devuelve "grafo completo
(editor) **o filtrado por progreso (alumno)**". Hoy solo está la primera: siempre
devuelve el grafo entero (`GrafoRoadmapResponse`), sin cruzar con `ProgresoNodo` para
tapar/estampar el estado de cada nodo según el alumno del token.

**Dónde vive:** `RoadmapController.obtenerGrafo` y `RoadmapService.obtenerGrafo` — no hay
rama por rol todavía. Los datos ya existen (`GET /alumnos/{aid}/progreso`).

**Por qué no bloquea la tarea actual:** el objetivo de la Fase 1 es el editor del
profesor ("agrego unidad → aparece la isla"). La navegación del alumno con nodos
bloqueados/habilitados es Fase 2/3 del plan, y el front puede componer grafo + progreso
por su cuenta mientras tanto (o lo hace el BFF).

**Cómo se paga:** cuando se arme la navegación del alumno — sumar una proyección que
haga el `left join` con `ProgresoNodo` y, si el token es de ALUMNO, devolver esa vista.

---

## 🔴 6. Las mutaciones del grafo no chequean "curso archivado" (409)

**Qué falta:** el contrato §0.5 lista un 409 para "editar un roadmap de curso
archivado". Hoy `SeccionService` / `NodoService` / `ConexionService` / `RoadmapService`
no consultan `CursoCohorteContexto.estado` antes de escribir.

**Dónde vive:** los 4 servicios del CRUD del grafo (`application/usecase/*Service.java`).
El cache `CursoCohorteContextoEntity` ya existe pero nadie lo alimenta todavía.

**Por qué no bloquea la tarea actual:** nada archiva cursos todavía en el sistema — el
`CursoArchivadoEvent` (Camino 6 del BPMN) aún no se consume, así que `CursoCohorteContexto`
nunca llega a `archivado`. El chequeo sin la fuente que lo dispare sería código muerto.

**Cómo se paga:** junto con el Camino 6 (`CursoArchivadoEvent` → congelar Roadmap y
Ranking en modo lectura). Ahí se agrega un guard compartido que las 4 escrituras del
grafo (y las de progreso) consultan antes de mutar.
