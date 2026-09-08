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

## 🟢 6. ~~Las mutaciones del grafo no chequean "curso archivado" (409)~~

**Qué faltaba:** el contrato §0.5 lista un 409 para "editar un roadmap de curso
archivado". `SeccionService` / `NodoService` / `ConexionService` / `RoadmapService` no
consultaban `CursoCohorteContexto.estado` antes de escribir.

**Dónde vivía:** los servicios del CRUD del grafo (`application/usecase/*Service.java`).

**Pagada:** al implementar el Camino 6 (`feat: Camino 6 — CursoArchivadoEvent → modo
lectura`). `ProcesarCursoArchivadoUseCase` marca el contexto como `ARCHIVADO` y el guard
compartido `GuardaCursoArchivado.exigirNoArchivado(cc)` se llama al inicio de toda
escritura del grafo y de `cierre/confirmar` — lanza `CursoArchivadoException` → 409.

---

## 🔴 7. Ranking: `inscriptos_activos` no viene de Cursos

**Qué falta:** RF-RNK-09 activa los percentiles P90/P10 solo con ≥ 10 **inscriptos**.
`RankingService.inscriptosActivos` lee ese número del cache `CursoCohorteContexto`, pero
nadie lo alimenta todavía, así que cae a un fallback: el nº de alumnos con actividad en
el curso (y loguea la degradación).

**Dónde vive:** `RankingService.inscriptosActivos(...)` — el `orElseGet` con el `log.warn`.

**Por qué no bloquea la tarea actual:** para el curso seed (12 alumnos, todos con
actividad) el fallback da el mismo resultado. La diferencia importa solo cuando hay
inscriptos que todavía no tocaron nada.

**Cómo se paga:** cuando exista la consulta síncrona a Cursos (T02) por inscriptos
activos (06-contrato-api.md §6.1) o el evento que alimente `CursoCohorteContexto`.

---

## 🔴 8. Ranking calculado en caliente, no materializado ni recalculado por evento

**Qué falta:** el contrato §7.4 y 02-modelo-de-datos.md §1.4 dicen que `RankingEntrada`
es una vista **materializada** que se recalcula por evento. Hoy `RankingService` la
calcula entera en cada `GET` a partir de las tablas base.

**Dónde vive:** `RankingService` completo; la nota al pie de `V1__init_schema.sql`.

**Por qué no bloquea la tarea actual:** V1 lo deja explícito — "query en caliente vs.
MATERIALIZED VIEW real es decisión de Fase 3". Con volúmenes de mock (≤ ~12 alumnos,
~30 nodos) el costo por request es despreciable y el resultado es idéntico.

**Cómo se paga:** en Fase 3, cuando se decida la estrategia (tabla `ranking_entrada` +
listeners de XP/vida/insignia/progreso que la recalculan, o `MATERIALIZED VIEW` con
`REFRESH`). También ahí entra la emisión de `AlumnoEntra/SaleZonaEvent` a Notificaciones,
que hoy no se emite porque no hay "corrida anterior" contra la cual comparar.

---

## 🔴 9. Cierre: faltan los gates por encuesta (RF-ENC-11) y por scores de IA (RF-IA-34)

**Qué falta:** `GET /roadmaps/{cc}/cierre/estado` debe devolver `listoParaArchivar = false`
también si la encuesta de cierre no está cumplida (RF-ENC-11) o si hay scores de IA
pendientes de cálculo diferido (RF-IA-34). Hoy solo chequea que todos los alumnos tengan
estado académico confirmado.

**Dónde vive:** `CierreService.estadoParaArchivar` — el `EstadoCierre` solo mira
`estado_academico_final`.

**Por qué no bloquea la tarea actual:** los dos datos vienen de afuera —
Encuestas (T04, §6.1 ya lo lista como consulta a hacer) y Evaluación LLM (T07) — y no
hay cliente para ninguno todavía. El chequeo sin la fuente sería siempre falso o siempre
verdadero, arbitrario.

**Cómo se paga:** cuando existan esos clientes/consultas, sumar los dos chequeos al
`EstadoCierre` (un `bloqueos: List<String>` en vez de solo `alumnosSinConfirmar`).

---

## 🔴 10. El nivel derivado del alumno no se expone en ningún endpoint

**Qué falta:** el HUD del alumno (RF-NIV, épica E6) muestra su nivel, pero el contrato §3
solo tiene `GET /roadmaps/{cc}/niveles` (la curva del curso), no un
`GET /alumnos/{aid}/nivel` ni un campo `nivel` en el ranking o el grafo. Hoy la derivación
existe y está testeada (`CurvaNiveles.nivelPara(xp)`), pero nada la llama en producción.

**Dónde vive:** `domain/service/CurvaNiveles.java` (la lógica, lista) — falta el
service + endpoint que la ate al XP total del alumno (`MovimientoXpRepository.sumarXpPorAlumno`
ya da el insumo).

**Por qué no bloquea la tarea actual:** el front no arrancó (Node estaba por debajo del
mínimo de Angular CLI). Sin consumidor, el endpoint sería código muerto. La curva del
curso —lo que sí pide el contrato §3— ya está.

**Cómo se paga:** cuando el Squad UI encare el HUD, agregar `GET /roadmaps/{cc}/alumnos/{aid}/nivel`
(o sumar `nivel` a la fila del ranking del propio alumno) llamando a
`curvaVigente(cc).nivelPara(xpTotalDelAlumno)`. Es ~10 líneas.
