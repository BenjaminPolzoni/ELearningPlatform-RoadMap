# 06 · Contrato de API y eventos

> Squad **Backend**. Todo detrás del API Gateway — **nunca** expuesto directo.
> Convención: `{cc}` = `curso_cohorte_id` · `{aid}` = `alumno_id`

## 0. Cómo nos enchufamos al borde (deck Tema 01)

El equipo del **API Gateway** (Tema 01) definió el contrato de borde en `Apuntes_e_info_tp/idea.pptx`.
El stack de borde es **Spring Cloud Gateway (WebFlux)** + **Netflix Eureka** (service discovery).
Nuestro servicio se acopla cumpliendo estas reglas — no son negociables:

### 0.1 Convención de nombres (nuestra identidad en la plataforma)

| Dónde | Patrón | Nuestro valor |
|---|---|---|
| Repositorio | `tpi-{nombre}` | `tpi-roadmap` |
| `spring.application.name` (Eureka) | `{nombre}-service` | **`roadmap-service`** |
| Prefijo externo del Gateway | `/api/{nombre}/**` | **`/api/roadmap/**`** |

> El `serviceId` (`roadmap-service`) es **la fuente del ruteo**: el Gateway lo normaliza a `roadmap`
> y arma la ruta `/api/roadmap/**` → `lb://ROADMAP-SERVICE`. **Todos los paths de este documento
> cuelgan de `/api/roadmap`** (ej. `POST /roadmaps` es en realidad `POST /api/roadmap/roadmaps`).

### 0.2 Registro en Eureka

`roadmap-service` publica en Eureka su nombre lógico, host+puerto y un *lease* con heartbeat
cada 30 s. El Gateway resuelve instancias vivas desde su caché — nunca guardamos direcciones fijas.
Requiere exponer `/actuator/health/liveness` y `/readiness`.

### 0.3 Dos niveles de autorización — el Gateway NO decide negocio

| Capa | Qué valida | Qué devuelve si falla |
|---|---|---|
| **Gateway** (borde técnico) | Firma del JWT, `iss`, `aud`, `exp`, algoritmo, `type` | **401** |
| **`roadmap-service`** (negocio) | Rol, **pertenencia** al curso y **ownership** del recurso | **403** |

Nosotros **no revalidamos el JWT** ni guardamos sesión. Confiamos en los **headers ya verificados**
que el Gateway inyecta (y que solo son confiables porque vienen de la red privada del Gateway):

| Header | Contenido |
|---|---|
| `X-Principal-Type` | `user` o `service` |
| `X-User-Id` / `X-User-Roles` | identidad del usuario (o `X-Service-Id` / `X-Service-Scopes` si es un servicio) |
| `X-Request-Id` · `traceparent` | correlación extremo a extremo |

> El Gateway **limpia** cualquier header sensible que venga del cliente (`X-User-Id`, etc.) y lo
> reemplaza por el verificado. Nosotros nunca leemos identidad del body ni de un header sin `X-`.

### 0.4 Cuando NOSOTROS llamamos a otro servicio (micro → micro)

No existe llamada directa `roadmap → backoffice`. La llamada **sale y vuelve por el Gateway**:

1. Pedimos un **token técnico** (Client Credentials o mTLS), `type=service`, vencimiento corto.
2. Lleva `sub=roadmap-service`, `aud=<servicio-destino>`, `scope=<permiso puntual>` y
   `on_behalf_of=<user-id>` **solo** si actuamos en nombre de un alumno.
3. El Gateway valida `type`, `serviceId`, `audience` y `scope`, y **bloquea tokens de persona**
   en rutas de servicio.

Ej. para leer parámetros: `aud=backoffice-service`, `scope=backoffice.params.read`.

### 0.5 Contrato de errores que emitimos

| Código | Cuándo lo emitimos |
|---|---|
| **401** | *(lo emite el Gateway, no nosotros)* token ausente/ inválido |
| **403** | Nuestra regla de negocio: rol/pertenencia/ownership insuficiente |
| **404** | Recurso inexistente o baja lógica |
| **409** | Conflicto de estado (ej. editar un roadmap de curso archivado) |
| **429 / 503 / 504** | *(los emite el Gateway)* rate limit / breaker / timeout |

Todo error va como **Problem Details** (`application/problem+json`) con `traceId`.

### 0.6 Checklist para que el Gateway nos exponga

Registrarse en Eureka **no** alcanza. El Gateway usa una *allowlist* (`include-expression`):

- [ ] `spring.application.name = roadmap-service`
- [ ] Opt-in en la `include-expression` del Gateway (lo coordina el equipo Tema 01)
- [ ] **Contrato OpenAPI** publicado (`docs/openapi/ms-roadmap.yaml`)
- [ ] Pruebas de ruteo, seguridad y resiliencia en verde

---

## 1. Grafo del roadmap

| Método y path | Rol | Para qué |
|---|---|---|
| `POST /roadmaps` | PROFESOR | Crear el roadmap de un curso (`curso_cohorte_id` recibido de Cursos) |
| `GET /roadmaps/{cc}` | PROFESOR · ALUMNO | Grafo completo (editor) o filtrado por progreso (alumno) |
| `PUT /roadmaps/{cc}` | PROFESOR | Editar metadata, cambiar borrador ↔ publicado |
| `POST /roadmaps/{cc}/secciones` | PROFESOR | Crear unidad con su `umbral_xp_desbloqueo` |
| `PUT /roadmaps/{cc}/secciones/{id}` | PROFESOR | Editar umbral u orden |
| `DELETE /roadmaps/{cc}/secciones/{id}` | PROFESOR | Baja lógica de la unidad |
| `POST /roadmaps/{cc}/nodos` | PROFESOR | Crear actividad: `desafio_id`, `es_obligatorio`, `reintentos_permitidos` |
| `PUT /roadmaps/{cc}/nodos/{id}` | PROFESOR | Editar atributos del nodo |
| `DELETE /roadmaps/{cc}/nodos/{id}` | PROFESOR | Baja lógica del nodo |
| `POST /roadmaps/{cc}/conexiones` | PROFESOR | Conectar dos nodos (prerequisito) |
| `DELETE /roadmaps/{cc}/conexiones/{id}` | PROFESOR | Quitar prerequisito |

> **Estado:** los 11 paths están **[IMPLEMENTADO]** (Fase 1). Detalle exacto de forma y
> códigos de error en `docs/openapi/ms-roadmap.yaml`.

### 1.1 Decisiones tomadas al implementar el CRUD del grafo

- **`GET /roadmaps/{cc}` devuelve el grafo entero** — metadata + `secciones[]` (ordenadas
  por `orden`, cada una con `nodos[]`) + `conexiones[]`. Es la "vista de editor" que el
  contrato siempre nombró; la Fase 0 solo devolvía la metadata como stub. La "vista de
  ALUMNO filtrada por progreso" sigue pendiente (ver `deuda-tecnica/`).
- **Baja lógica en cascada** (RF-NFR-01): `DELETE` de una sección da de baja además sus
  nodos activos y toda conexión que los toque; `DELETE` de un nodo da de baja las
  conexiones que lo tienen de origen o destino. Nada se borra físico.
- **El grafo de prerequisitos es un DAG.** `POST /conexiones` rechaza (400) el auto-lazo
  y cualquier arista que cerraría un ciclo (`A→…→A` dejaría esos nodos imposibles de
  desbloquear — se deduce de la máquina de estados, 02-modelo-de-datos.md §5). El
  duplicado activo es 409. La detección de ciclos vive en `domain.service.DetectorCiclos`
  (dominio puro, testeable sin Spring).
- **`PUT` de sección y de nodo son reemplazo completo** de los campos editables, no
  PATCH. En el nodo, `seccionId` viaja siempre y permite mover la actividad a otra unidad
  del mismo roadmap.
- **`HITO` no lleva `desafioId`** (marcador sin evaluación) — se rechaza con 400 si viene.
- **`estado` del nodo no está en el grafo del editor**: es por alumno y vive en
  `ProgresoNodo` (`GET /alumnos/{aid}/progreso`).
- **Pertenencia**: toda sección/nodo/conexión se valida contra el roadmap del `{cc}` del
  path; si el recurso existe pero es de otro curso se responde 404 (no se filtra su
  existencia).
- **Curso archivado → 409** en toda escritura del grafo y en `cierre/confirmar`
  (`GuardaCursoArchivado`, RF-CUR-09). El estado `ARCHIVADO` lo setea el Camino 6
  (`CursoArchivadoEvent`). Las lecturas y el ranking siguen respondiendo.

---

## 2. Progreso, XP y vidas

### Progreso
| Método y path | Rol | Para qué |
|---|---|---|
| `GET /alumnos/{aid}/progreso?curso_cohorte_id={cc}` | ALUMNO (propio) · PROFESOR | Estado de cada nodo para ese alumno |

### XP
| Método y path | Rol | Para qué |
|---|---|---|
| `GET /alumnos/{aid}/xp?curso_cohorte_id={cc}` | ALUMNO (propio) · PROFESOR | Historial de movimientos + total |
| `POST /alumnos/{aid}/xp/ajustes` | ADMIN | Corrección manual excepcional, **auditada** |

### Vidas
| Método y path | Rol | Para qué |
|---|---|---|
| `GET /alumnos/{aid}/vidas?curso_cohorte_id={cc}` | ALUMNO (propio) · PROFESOR | Vidas vigentes + histórico de pérdidas |
| `POST /alumnos/{aid}/vidas/recuperacion` | ALUMNO | Iniciar el desafío de recuperación (RF-REC-04) |
| `POST /alumnos/{aid}/vidas/compra` | interno | Registrar `MovimientoVida` tipo `comprada` (lo confirma Banco vía Gateway) |

---

## 3. Niveles, insignias y ranking

| Método y path | Rol | Para qué |
|---|---|---|
| `GET /roadmaps/{cc}/niveles` | PROFESOR · ALUMNO | Curva de niveles vigente del curso |
| `POST /roadmaps/{cc}/niveles` | PROFESOR | Definir niveles custom (máx. 10, RF-NIV-04) |
| `GET /alumnos/{aid}/insignias?curso_cohorte_id={cc}` | ALUMNO (propio) · PROFESOR | Insignias ganadas en el curso |
| `GET /roadmaps/{cc}/ranking` | ALUMNO (vista filtrada) · PROFESOR (completa) | Tabla de posiciones |
| `GET /roadmaps/{cc}/ranking/candidatos` | PROFESOR | Candidatos P90/P10 |

> La respuesta de `/ranking` **cambia según el rol** del token. Para ALUMNO devuelve
> top 3, bottom 3, su fila y los cortes anónimos (RF-RNK-03). El filtrado se hace en el
> servidor — nunca mandar la tabla completa y filtrar en el front.

---

## 4. Cierre de curso

| Método y path | Rol | Para qué |
|---|---|---|
| `GET /roadmaps/{cc}/cierre/candidatos` | PROFESOR | Candidatos a confirmar antes de archivar |
| `POST /roadmaps/{cc}/cierre/confirmar` | PROFESOR | Confirmar estado académico final por alumno (RF-RNK-10) |
| `GET /roadmaps/{cc}/cierre/reporte` | PROFESOR · ADMIN | Exportar reporte (RF-RNK-13) |
| `GET /roadmaps/{cc}/cierre/estado` | interno | **Precondición síncrona para archivar** (RF-CUR-08b) — la consulta Cursos |

> **Estado:** los 4 paths **[IMPLEMENTADO]** (`CierreService` + `CierreController`).
> Roadmap NO archiva el curso — solo confirma el estado final por alumno (upsert en
> `estado_academico_final`) y responde la precondición. Decisiones:
> - **Estado sugerido, no impuesto:** `cierre/candidatos` sugiere `PROMOCIONADO` para el
>   candidato RF-RNK-05 y `REGULAR` para el resto; `NO_REGULAR`/`ABANDONO` solo a mano.
> - **`cierre/estado`** hoy solo bloquea por "falta confirmar algún alumno". Los gates por
>   encuesta de cierre (RF-ENC-11) y por scores de IA diferidos (RF-IA-34) dependen de
>   servicios que no consultamos todavía → `deuda-tecnica/`.
> - **Reporte:** devuelve datos propios (alumnoId, estado, XP, insignias); legajo y nombre
>   los agrega el BFF (RF-RNK-13, §6.2).

---

## 5. Eventos (Kafka)

Los eventos **no son endpoints HTTP**: son suscripciones y publicaciones al bus **Kafka**.
Cada tipo de evento es un *topic*; `ms-roadmap` es productor y consumidor.

### Escuchamos

| Evento | Origen | Efecto |
|---|---|---|
| `DesafioCompletadoEvent` | Motor de Desafíos (T03, G9) | Registra `MovimientoXP`, actualiza `ProgresoNodo`, evalúa desbloqueo, recalcula ranking |
| `RecuperacionCompletadaEvent` | Motor de Desafíos (T03, G9) | Éxito: registra `MovimientoVida` tipo `recuperada` (RF-REC-04). Fallo: no hace nada — reintentable sin límite |
| `CursoArchivadoEvent` | Cursos (T02, G1) | **[IMPLEMENTADO]** Actualiza `CursoCohorteContexto` a `ARCHIVADO` → `GuardaCursoArchivado` congela toda escritura del grafo y del cierre (409). Camino 6, listener con `ConsumerFactory` propio |
| `AlumnoInscriptoEvent` | Cursos (T02, G1) | **[IMPLEMENTADO]** Bootstrapping (README §6.8): habilita las raíces de la **primera** sección del roadmap para ese alumno (`ProcesarAlumnoInscriptoUseCase` → `EvaluarDesbloqueoService.habilitarRaicesDeSeccion`). ⚠️ nombre/forma del evento a confirmar |
| `ScoreIAApeladoEvent` | Evaluación LLM (T07) | Registra `MovimientoXP` tipo `ajuste_apelacion` y recalcula |

### Emitimos

| Evento | Destino | Cuándo |
|---|---|---|
| `AlumnoEntraZonaEvent` / `AlumnoSaleZonaEvent` | Notificaciones (T11) | Al detectar cambio de zona P90/P10 entre corridas del ranking |

### Idempotencia — obligatoria

Todo consumidor deduplica por `origen_evento_id`. El bus puede reintentar la entrega, y
procesar dos veces el mismo `DesafioCompletadoEvent` significaría otorgar XP duplicado.

```java
if (movimientoXpRepository.existsByOrigenEventoId(evento.origenEventoId())) {
    log.info("Evento {} ya procesado, se ignora", evento.origenEventoId());
    return;
}
```

---

## 6. Consultas a otros servicios

### 6.1 Las que iniciamos nosotros — para nuestra propia lógica

Todas **vía Gateway**, con **token técnico** (`type=service`, `aud`, `scope` — ver §0.4). Nunca
llamada directa, nunca lectura de base ajena. Solo pedimos lo que necesitamos para *calcular* algo
nuestro (XP, niveles, si aplican zonas, si se destraba el cierre):

| Servicio | Tema · Grupo | Qué pedimos | `aud` / `scope` sugerido |
|---|---|---|---|
| Backoffice | T12 · G6 | PAR-01, 02, 05, 06, 08, 09, 12 | `backoffice-service` / `backoffice.params.read` |
| Cursos | T02 · G1 | Inscriptos activos | `cursos-service` / `cursos.cohorte.read` |
| Encuestas | T04 · G4 | Marcador binario de cumplimiento | `encuestas-service` / `encuestas.cumplimiento.read` |

> **Retry solo idempotente:** estas son lecturas `GET`, así que se pueden reintentar con backoff +
> jitter; un `429` respeta `Retry-After`. **Ningún PAR-XX se hardcodea:** si Backoffice no responde,
> se usa el último valor cacheado y se loguea la degradación (RF-NFR-04) — nunca un default silencioso.

> **Ningún PAR-XX se hardcodea.** Si Backoffice no responde, se usa el último valor cacheado y
> se loguea la degradación (RF-NFR-04) — nunca un default silencioso en el código.

### 6.2 Lo que hace el BFF — **ya no es nuestro**

El **BFF** (que no mantenemos) es quien **consolida por pantalla**: toma nuestra respuesta cruda
y la enriquece con datos de otros servicios. Nosotros exponemos IDs y datos propios; **no
llamamos a Identidad ni a Banco para “rellenar” una fila**.

| Enriquecimiento | Lo aporta | Lo agrega |
|---|---|---|
| Avatar, nombre, apellido, legajo del alumno | Identidad (T01) | **BFF** |
| Monedas del alumno (detalle de fila del ranking) | Banco (T08) | **BFF** |

> **Consecuencia de diseño:** nuestro `GET /ranking` devuelve `alumno_id`, `xp_total`,
> `insignias_count`, vidas, `posicion`, `percentil` y `zona`. El nombre, el avatar y las monedas
> los pega el BFF encima. Esto **simplifica `ms-roadmap`** y resuelve el viejo problema de “el
> detalle de fila pide monedas que no son nuestras”.
>
> ⚠️ Con el BFF haciendo el enriquecimiento, la entidad `AlumnoPerfilCache` del modelo
> (`02-modelo-de-datos.md`) queda **redundante**. Decisión a confirmar con el equipo: eliminarla o
> conservarla solo para el anonimato de filas ajenas (RF-RNK-07).

---

## 7. Reglas de implementación del backend

1. **Toda entidad propia lleva `curso_cohorte_id`.** Sin esa clave no hay forma de acotar consultas después sin migrar datos.
2. **Borrado lógico en todas las tablas**, sin excepción (RF-NFR-01): flag + timestamp de baja.
3. **XP y vidas son append-only.** Nunca un `UPDATE` sobre un movimiento existente.
4. **`RankingEntrada` es vista materializada.** Se recalcula por evento, no se edita.
5. **Idempotencia** en todo consumidor de eventos.
6. **Autorización en el servicio.** El gateway valida que el token sea auténtico y esté vigente; decidir si *este* usuario puede hacer *esta* acción es nuestro.
7. **Resiliencia** (RF-NFR-04): degradación controlada ante caída de dependencias externas.
8. **120 sesiones concurrentes** (RF-NFR-03) es el objetivo de la prueba de carga.

---

## 8. Estructura del microservicio

```
ms-roadmap/src/main/java/ar/utn/frc/tup/roadmap/
├─ domain/
│  ├─ model/           # Roadmap, Seccion, Nodo, MovimientoXP, MovimientoVida...
│  ├─ service/         # MotorXp, MotorVidas, MotorDesbloqueo, CalculadoraRanking
│  └─ port/            # interfaces hacia afuera
├─ application/
│  └─ usecase/         # un caso de uso por operación del contrato
├─ infrastructure/
│  ├─ persistence/     # entidades JPA, repositorios, Flyway
│  ├─ rest/            # controllers + DTOs
│  ├─ messaging/       # productores y consumidores del bus
│  └─ client/          # clientes hacia el Gateway (Backoffice, Identidad, Banco)
└─ config/
```

El dominio no conoce JPA, ni REST, ni el bus. Las reglas de XP, vidas, desbloqueo y ranking
son **testeables sin levantar Spring**, y ese es el punto.

---

## 9. Checklist del squad

- [x] `docs/openapi/ms-roadmap.yaml` v0 — contrato completo, cada path marcado `[IMPLEMENTADO]`/`[PLANEADO]`
- [x] Esqueleto Boot 4.1.1 + Java 21 + Postgres 17 — `roadmap-service`, compila y corre
- [x] Migraciones Flyway del modelo propio — `V1__init_schema.sql`, espejo exacto de las 12 entidades
- [x] Dockerfile multi-stage + `docker-compose.yml` — `docker compose config` valida sin errores
- [x] Gateway con ruteo hacia `ms-roadmap` — stand-in local, ruteo estático `/api/roadmap/** → lb://ROADMAP-SERVICE`
- [x] Slice vertical de referencia (`POST`/`GET /roadmaps`) — el patrón a calcar para el resto del CRUD
- [x] CRUD completo del grafo: secciones, nodos, conexiones (Fase 1) —
      `SeccionService` / `NodoService` / `ConexionService` calcando el patrón de
      `RoadmapService`. `RoadmapController` cubre ahora los 11 paths de §1. Decisiones
      tomadas al implementar (ver también §1.1 más abajo):
      · `GET /roadmaps/{cc}` devuelve el **grafo entero** (secciones con nodos +
        conexiones), no solo la metadata — era lo que el contrato siempre pidió para el
        editor; la Fase 0 lo tenía como stub.
      · **Baja lógica en cascada**: borrar una sección da de baja sus nodos y las
        conexiones que los tocan; borrar un nodo da de baja sus conexiones (RF-NFR-01).
      · El grafo de prerequisitos se mantiene **DAG**: se rechaza el auto-lazo y toda
        arista que cerraría un ciclo (`DetectorCiclos`, dominio puro), y el duplicado.
      · `estado` del nodo no viaja en el grafo del editor — es por alumno (`ProgresoNodo`).
- [x] `MotorXp` (Strategy) — 4 `CalculadoraXp`, tests sin Spring
- [x] `MotorVidas` — regla RF-DES-07 vía el resultado de `EstadoNodo.alFallar`
- [x] `MotorDesbloqueo` — umbral de XP, alcance MVP (RF-CUR-06)
- [x] `EstadoNodo` como máquina de estados real (patrón State) — corrigió una inconsistencia
      del propio modelo documentado (ver 02-modelo-de-datos.md §5, nota de corrección)
- [x] `EspecificacionesRanking` (Specification) — RF-RNK-05/06, listo para cuando se arme el ranking
- [x] `ProcesarDesafioCompletadoUseCase` — Camino 1 (éxito) y Camino 2 (fallo) del BPMN,
      orquestando State + Strategy + los dos motores
- [x] `EvaluarDesbloqueoService` — cascada de desbloqueo: sucesor directo por grafo
      (`RoadmapConexion`, con soporte para nodos de fusión con más de un prerequisito) +
      nodos raíz de la siguiente sección por umbral de XP (RF-CUR-06). Resuelve la mitad
      "sección ya en curso" de la duda de bootstrapping (README §6.8) — la mitad "alumno
      arranca el curso" sigue abierta
- [x] Camino 3 (recuperación de vida, RF-REC-04/06) — `IniciarRecuperacionUseCase` +
      `ProcesarRecuperacionCompletadaUseCase`, `DesafioRecuperacionEntity` como pool por
      curso (no un nodo del mapa — ver corrección en 02-modelo-de-datos.md §4),
      `SelectorRecuperacion` (elige al azar priorizando no resueltos) y
      `MotorVidas.calcularVidasVigentes` (techo PAR-12 aplicado en cada paso). Endpoint
      `POST /alumnos/{aid}/vidas/recuperacion` implementado
- [x] Consumidor idempotente de `DesafioCompletadoEvent`, `RecuperacionCompletadaEvent`,
      `CursoArchivadoEvent` y `AlumnoInscriptoEvent` — patrón Inbox
      (`EventoProcesadoEntity`), cubre todos los caminos de cada uno. Cada tipo de evento
      con su propio `ConsumerFactory`/`containerFactory` (`KafkaConsumerConfig`, con
      `baseProps` común) — resuelve la deuda #3
- [x] Bootstrapping de `ProgresoNodo` (README §6.8) completo: `AlumnoInscriptoEvent` →
      `ProcesarAlumnoInscriptoUseCase` habilita las raíces de la primera sección
      (`EvaluarDesbloqueoService.habilitarRaicesDeSeccion`). Cierra la mitad "el alumno
      arranca el curso" que quedaba abierta
- [x] Camino 6 del BPMN: `CursoArchivadoEvent` → `ProcesarCursoArchivadoUseCase` marca
      `CursoCohorteContexto` = `ARCHIVADO`; `GuardaCursoArchivado` (guard compartido)
      hace fallar con 409 toda escritura del grafo y `cierre/confirmar` (RF-CUR-09).
      Resuelve la deuda #6
- [x] Cálculo de ranking con percentiles y cascada de desempate — `CalculadoraRanking`
      (dominio puro: orden por XP + cascada RF-RNK-11, percentil `100·(n-pos)/(n-1)`,
      zona P90/P10 solo con ≥10 inscriptos RF-RNK-09) + `RankingService` (arma insumos
      desde las tablas base **en caliente**, no materializado — V1 lo deja para Fase 3).
      `GET /roadmaps/{cc}/ranking` (respuesta según rol: completa vs. vista de alumno
      anónima RF-RNK-03/07) y `GET .../ranking/candidatos` (RF-RNK-05/06). Deudas nuevas:
      inscriptos_activos reales de Cursos, y materialización/recálculo por evento.
- [x] Curva de niveles (§3, RF-NIV-03/04/05, RF-CFG-05) — `CurvaNiveles` (dominio puro:
      value object inmutable, valida las invariantes de RF-NIV-04 —entre 1 y 10 niveles,
      arranque en umbral 0, estrictamente creciente— y deriva `nivelPara(xp)` sin techo
      RF-NIV-05) + `NivelesService` (curva PAR-09 por defecto si el curso no definió una;
      `definirCurva` reemplaza con baja lógica) + `NivelesController`
      (`GET`/`POST /roadmaps/{cc}/niveles`). El nivel del alumno todavía **no se expone** en
      ningún endpoint — lo consume el HUD del front, que no arrancó (deuda #10). Nombres de
      la curva PAR-09 provisorios: RF-NIV-03 promete un set nombrado que la cátedra no dio
      (README §6).
- [x] Tests unitarios de dominio sin contexto de Spring — 60 tests — `MotorDesbloqueo`/
      `MotorXp`/`MotorVidas`/`EstadoNodo`/`SelectorRecuperacion` se instancian reales,
      Mockito solo en los repositorios
- [ ] Bindear `maven-failsafe-plugin` a integration-test/verify para que `MsRoadmapApplicationIT`
      corra en CI contra infraestructura real (hoy `mvn test` da verde sin necesitarla — a propósito)
- [ ] Clientes stub de Backoffice / Identidad / Banco — hoy solo existe `LectorParametrosStubAdapter`,
      falta Identidad y Banco (no los necesita todavía ningún flujo implementado)
- [ ] Validar `DesafioCompletadoEventDto` (nombre de tópico y forma) con el Grupo 9 — es una
      hipótesis de trabajo nuestra, no un contrato confirmado (ver README §6.9)

> **Verificado localmente:** `mvn compile` y `mvn test` en verde en los 3 módulos
> (`ms-roadmap`, `eureka-server`, `gateway`). **Pendiente de verificar:** arranque real
> contra Postgres/Eureka/Kafka vía `docker compose up` — Docker Desktop no estaba corriendo
> al momento de este commit. Confirmar antes de dar la Fase 0 por cerrada.
