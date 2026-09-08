# Grupo 10 — Roadmap y Progreso

> Tema 10 del Proyecto Final Integrador · TUP · UTN Facultad Regional Córdoba
> Plataforma de e-learning gamificada — 12 equipos, ~100 alumnos.

Este repositorio contiene el **mock visual y funcional** del módulo *Roadmap y Progreso*:
el mapa de islas 2.5D del curso, el editor del profesor, el motor de XP / niveles / vidas
y el ranking por cohorte.

---

## 1. Qué es nuestro módulo

La plataforma representa **cada curso como un roadmap de aprendizaje incremental y gamificado**
(RF-CUR-01). El alumno avanza resolviendo desafíos, acumula XP, insignias y vidas, y
compite dentro de su cohorte.

### 1.1 Alcance oficial asignado (Tema 10)

Esta es la asignación **oficial** de la cátedra, con su corte núcleo / extra. Es la fuente de
verdad sobre qué es obligatorio y qué es un plus. Todo lo demás en estos documentos se subordina
a esta tabla.

| # | Ítem oficial | Alcance | Qué significa en concreto | Épica |
|---|---|---|---|---|
| 🟩 | **Grafo de contenidos** | **NÚCLEO** | Secciones, nodos, conexiones + editor del profesor | E1 |
| 🟩 | **Prerequisitos y desbloqueo** | **NÚCLEO** | Máquina de estados del nodo + desbloqueo por umbral de XP | E1 · E4 |
| 🟩 | **XP y niveles** | **NÚCLEO** | XP como historial de movimientos + niveles derivados | E4 · E6 |
| 🟩 | **Logros** | **NÚCLEO** | Insignias: registro, conteo, exhibición (ver 3.5) | E7 |
| 🟦 | **Visualización del recorrido** | EXTRA | El **mapa 2.5D de islas** y el mapa interno de unidad | E2 · E3 |
| 🟦 | **Comparativas de cohorte** | EXTRA | El **ranking** por XP, zonas P90/P10 y el cierre académico | E8 · E9 |

> **Lectura clave para el equipo:** el núcleo *obligatorio* es la **capa de datos** (grafo,
> desbloqueo, XP, niveles, logros). El **mapa 3D** —el corazón visual del proyecto— y el
> **ranking** son oficialmente **EXTRA**. No los despriorizamos (son lo que hace la demo), pero
> si la cátedra evalúa por núcleo, el motor de datos tiene que estar sólido **primero**.

### 1.2 Dos discrepancias con este recorte — a confirmar

1. **Las "Vidas" no figuran en este resumen** (ni núcleo ni extra). Pero la propuesta de
   arquitectura las tenía como núcleo del Tema 10, y la nota del **Tema 03 dice explícitamente**
   que *"las vidas quedan asignadas al Tema 10; el Tema 03 emite el hecho y el Tema 10 decide su
   efecto sobre vidas y XP"*. Las tratamos como **nuestras** (mecánica de progreso, épica E5) hasta
   que la cátedra diga lo contrario. Ver dudas abiertas.
2. **El "cierre académico"** (confirmar estado final, reporte RF-RNK-10/13) no está nombrado como
   ítem propio: lo ubicamos dentro de *"Comparativas de cohorte"* por ser la contraparte del
   ranking al archivar. Confirmar si es alcance nuestro o si se recorta.

### 1.3 Fronteras del alcance

| Somos dueños de | No somos dueños de |
|---|---|
| El grafo del roadmap (secciones, nodos, conexiones) | El **contenido** de los desafíos → Temas 03/04/05 |
| El progreso del alumno por nodo (prerequisitos y desbloqueo) | La **corrección** y la nota → Temas 03/04/05/07 |
| El XP, los niveles y los logros/insignias | Las **monedas** y la billetera → Tema 08 (Banco) |
| Las vidas (ver discrepancia arriba) | El **padrón** y la matrícula → Temas 01 y 02 |
| Las comparativas de cohorte / ranking *(extra)* | Las **notificaciones** → Tema 11 |
| El cierre académico del curso *(a confirmar)* | Los **parámetros PAR-XX** → Tema 12 (Backoffice) |

> **Regla de oro del alcance:** nosotros *ubicamos y conectamos* nodos en el mapa.
> El contenido de cada desafío vive en otro servicio y lo referenciamos por `desafio_id`.
> En el mock ese contenido se renderiza con datos stub.

---

## 2. Roles

| Rol | Qué puede hacer en nuestro módulo |
|---|---|
| **PROFESOR** | Crear y editar el grafo de su curso (unidades, actividades, conexiones), definir umbrales de XP, obligatoriedad y reintentos, ver el ranking completo, confirmar el estado académico final y exportar el reporte de cierre |
| **ALUMNO** | Navegar su mapa, ver el estado de cada nodo, su XP, nivel, vidas e insignias, y su vista filtrada del ranking |
| **ADMIN** | Correcciones manuales excepcionales de XP (auditadas). Los parámetros globales los edita vía Backoffice, no acá |
| **RESPONSABLE** | ⚠️ Rol sin definir en el PRD — bloquea la matriz de permisos. Ver dudas abiertas |

---

## 3. Requerimientos funcionales

### 3.1 Grafo y editor — RF-CUR

| RF | Descripción | MVP |
|---|---|---|
| RF-CUR-01 | Cada curso se representa como un roadmap gamificado (mapa a explorar) | ✅ |
| RF-CUR-02 | Los cursos se crean a partir de templates precargados de roadmap | ✅ |
| RF-CUR-03 | Los profesores comparten sus roadmaps con la comunidad | ❌ Fase 3 |
| RF-CUR-04 | Debe existir un editor gráfico de roadmaps | ✅ |
| RF-CUR-05 | Cursos y desafíos editables aun después de publicados y en uso | ✅ |
| RF-CUR-06 | Secciones con reglas de desbloqueo configurables — **MVP: solo umbral de XP** | ✅ parcial |
| RF-CUR-07 | La plataforma asiste al profesor con sugerencias, validaciones y plantillas | ✅ |
| RF-CUR-09 | Un curso archivado sigue visible en modo lectura | ✅ |

### 3.2 XP y niveles — RF-NIV / RF-CFG

| RF | Descripción |
|---|---|
| RF-NIV-03 | Set de niveles predefinidos del sistema, reutilizable entre cursos |
| RF-NIV-04 | Máximo 10 niveles por curso |
| RF-NIV-05 | Sin techo ni reseteo de XP por nivel — el nivel es un rótulo cosmético, el ranking ordena por XP real |
| RF-CFG-05 | El PROFESOR define dificultad, obligatoriedad, reintentos, umbral de XP y set de niveles de su curso |
| RF-CFG-06 | Un cambio de parámetro rige **solo hacia adelante** — nunca se recalcula XP ya otorgado |
| RF-IA-18 | Una apelación de score de IA puede **reducir** XP ya otorgado → el XP es historial, no contador |

### 3.3 Vidas y reintentos — RF-DES / RF-REC

| RF | Descripción |
|---|---|
| RF-DES-06 | Cada nodo tiene un flag `es_obligatorio` definido por el profesor |
| RF-DES-07 | Cada nodo tiene `reintentos_permitidos` (0 a 3). Al agotarlos y volver a fallar, se descuenta 1 vida |
| RF-REC-04 | Desafío de recuperación: solo con 0 vidas, no consume vidas, reintentable sin límite, otorga exactamente 1 vida |
| RF-REC-06 | Pool de desafíos de recuperación por curso; se elige uno al azar priorizando los no resueltos |
| — | Los desafíos personalizados por LLM **nunca** consumen vidas |

### 3.4 Ranking y cierre — RF-RNK

| RF | Descripción |
|---|---|
| RF-RNK-01 | Ranking por XP, visible solo entre alumnos del mismo curso |
| RF-RNK-03 | Vista del ALUMNO: su puntaje completo, top 3, bottom 3 y los cortes P90/P10 sin identidad |
| RF-RNK-05 | Candidato a promoción = P90 **+** 0 vidas perdidas históricas **+** 100 % de obligatorios aprobados |
| RF-RNK-06 | Riesgo de regularidad = P10 **+** no superó todos los ejercicios |
| RF-RNK-07 | Click en fila propia → detalle con datos personales. Fila ajena → sin identificar al alumno |
| RF-RNK-09 | Percentiles P90/P10 activos **únicamente** en cursos con 10 o más inscriptos |
| RF-RNK-11 | Cascada de desempate: 1° más insignias · 2° menos vidas perdidas · 3° más ejercicios completados |
| RF-RNK-10 | Pantalla de confirmación manual del estado académico final por el profesor |
| RF-RNK-13 | Exportar reporte de cierre: legajo, nombre, estado final, XP, insignias |
| RF-ENC-11 | No exponer el resultado académico al alumno hasta que la encuesta de cierre esté cumplida |
| RF-IA-34 | El cierre se bloquea si hay scores de IA pendientes de cálculo diferido |

### 3.5 Insignias y logros — RF-RNK-11 + gamificación

El alumno gana **insignias** al completar desafíos, mantener rachas de ejercicios resueltos,
acumular días de actividad, alcanzar hitos de XP/nivel, etc. Nosotros las **registramos, contamos
y exhibimos** — pero cuidado, no todos los disparadores nacen en nuestro dominio.

**Lo que sí es nuestro:**

- Registrar cada insignia como `InsigniaOtorgada`, con su evento de origen y `origen_evento_id`
  (idempotente — la misma insignia no se otorga dos veces).
- **Contar** insignias por alumno/curso → primer criterio de desempate del ranking (RF-RNK-11).
- **Exhibir** las insignias/logros del alumno en su perfil y HUD (objetivo del módulo).

> No confundir con las **insignias "destacadas"** que el alumno elige mostrar en su perfil: esa
> personalización cosmética la resuelve **Mercado (Tema 09)**. Nosotros contamos las que *ganó*,
> no las que *elige exhibir*.

**Los disparadores que mencionás, y de dónde nace cada hecho:**

| Disparador | Ejemplo de insignia | ¿Quién detecta el hecho? | ¿La otorgamos con datos propios? |
|---|---|---|---|
| Completar desafío / hito / unidad | *"Primer desafío"*, *"Unidad completa"*, *"Boss derrotado"* | Motor de Desafíos → `DesafioCompletadoEvent` (ya lo escuchamos) | ✅ el hecho ya nos llega |
| Racha de ejercicios resueltos | *"5 seguidos sin fallar"* | Nosotros, si la racha es **intra-curso** (vemos `ProgresoNodo` / `MovimientoXP`) | ✅ solo si es por curso-cohorte |
| Hito de XP / nivel | *"Nivel 5"*, *"1000 XP"* | Nosotros (derivamos de `MovimientoXP`) | ✅ |
| Días conectados / actividad | *"7 días seguidos"*, *"Madrugador"* | ⚠️ **Nadie en nuestro dominio registra sesiones/login** → Identidad (T01) o Social (T11) | ❌ necesitamos un evento externo |

**Dos tensiones de diseño que hay que resolver, no esconder:**

1. **Choque con el principio "todo atado a un curso-cohorte".** Una racha o los "días conectados"
   *a nivel plataforma* no encajan en nuestro modelo, donde nada existe fuera de un curso.
   **Recomendación MVP:** toda insignia es **por curso-cohorte** (la racha se cuenta dentro del
   curso). Los logros globales de plataforma quedan **fuera de alcance** hasta que exista un
   servicio de logros que los posea.
2. **"Rachas y misiones" está en la columna "Para más adelante"** del documento de arquitectura
   (Tema 10), y ahí pagan *"solo en monedas e insignias"* — las **monedas las acredita Banco
   (T08)**, la **insignia la registramos nosotros**. Además, en las dudas del propio equipo se
   cuestiona si "rachas y misiones" y "temporadas" están confirmadas por la cátedra o son un
   agregado de IA: **no aparecen en el PRD original** (ver dudas abiertas).

**Motor de reglas de insignias:** la lógica *"si racha == 5 → otorgar insignia"* vive en Roadmap
**para los disparadores intra-curso** (ya tenemos los datos y los eventos). Los disparadores que
dependen de hechos externos (días conectados) solo se implementan si otro servicio nos emite el
evento correspondiente — hasta entonces, quedan como insignias definidas pero inactivas.

### 3.6 No funcionales — RF-NFR

| RF | Descripción | Impacto en el mock |
|---|---|---|
| RF-NFR-01 | Borrado lógico en todas las entidades (flag + timestamp) | Nada se borra físicamente |
| RF-NFR-03 | 120 usuarios registrados, 120 sesiones concurrentes | Prueba de carga en Fase 3 |
| RF-NFR-04 | Resiliencia ante fallos de dependencias externas | Degradación controlada |
| RF-NFR-05 | **100 % escritorio.** En móvil informar *"esta sección requiere una computadora"* | Guard de viewport |
| RF-NFR-07 | Preparada para múltiples idiomas por diseño — MVP español | Sin strings hardcodeados |
| RF-NFR-10 | Conservar datos académicos 5 años desde el archivado | Modelo, no runtime |

### 3.7 Parámetros que leemos de Backoffice (PAR-XX)

Nunca hardcodeados — se consultan en runtime al Tema 12.

| Parámetro | Qué es | Default de referencia |
|---|---|---|
| PAR-01 | XP base por desafío según dificultad | 100 / 250 / 500 (Básico / Medio / Avanzado) |
| PAR-02 | XP de desafío personalizado | Menor, solo XP sin monedas |
| PAR-04 | Rango de variación de XP por calidad y tiempo | — |
| PAR-05 | Ajuste de XP por score de uso de IA | — |
| PAR-06 | Precio de compra de una vida | 300 monedas |
| PAR-08 | Umbral de XP por defecto para desbloquear sección | — |
| PAR-09 | Curva de XP de los 10 niveles | 0 / 250 / 600 / 1.100 / 1.800 / 2.800 / 4.200 / 6.000 / 8.500 / 12.000 |
| PAR-12 | Vidas iniciales y máximas por curso | 3 y 3 |
| PAR-13 | Reintentos permitidos por nodo | 0 a 3 |

---

## 4. Épicas generales

Alcance según el corte oficial (1.1): 🟩 **Núcleo** · 🟦 **Extra** · ⬜ **Transversal / a confirmar**

| # | Épica | Alcance | RF que cubre | Squad |
|---|---|---|---|---|
| **E1** | Grafo y editor de roadmap (PROFESOR) | 🟩 Núcleo | RF-CUR-04/05/06/07 | Editor |
| **E2** | Mapa de islas 2.5D del alumno | 🟦 Extra | RF-CUR-01 | Engine |
| **E3** | Mapa interno de unidad (nodos estilo Mario 3) | 🟦 Extra | RF-CUR-01/06 | UI |
| **E4** | Motor de XP como historial + desbloqueo | 🟩 Núcleo | RF-CUR-06, RF-CFG-06, RF-IA-18, PAR-01/05 | Backend |
| **E5** | Vidas, reintentos y recuperación | ⬜ A confirmar | RF-DES-07, RF-REC-04/06, PAR-12 | Backend |
| **E6** | Niveles derivados de XP | 🟩 Núcleo | RF-NIV-03/04/05, PAR-09 | Backend |
| **E7** | Logros / insignias (registro, conteo, reglas intra-curso, exhibición) | 🟩 Núcleo | RF-RNK-11 + gamificación | Backend + UI |
| **E8** | Ranking y zonas P90/P10 | 🟦 Extra | RF-RNK-01/03/05/06/07/09/11 | UI + Backend |
| **E9** | Cierre de curso y reporte académico | ⬜ A confirmar | RF-RNK-10/13, RF-ENC-11, RF-IA-34 | Editor + Backend |
| **E10** | Librería UI compartida (`shared/ui`) | ⬜ Transversal | Co-owned con Grupo 2 | UI |
| **E11** | Integración: API Gateway + bus de eventos | ⬜ Transversal | Arquitectura de plataforma | Backend |

---

## 5. Comunicación con otros equipos

### Piezas de plataforma que NO mantenemos

| Pieza | Qué hace | Quién la mantiene |
|---|---|---|
| **Nginx** | Entrada pública: sirve los estáticos de Angular y rutea el tráfico de la plataforma | Plataforma |
| **BFF** personalizado | Consolida la respuesta *por pantalla* (junta lo nuestro + monedas + perfil) | **Otro equipo** |
| **API Gateway** (Spring Cloud Gateway) | Única puerta a los microservicios; valida JWT y rutea | Tema 01 |
| **Eureka** (service discovery) | Registro donde cada micro publica su ubicación; el Gateway lo consulta | Tema 01 |
| **Kafka** | Coordinador de eventos asincrónicos (el bus) | Plataforma |

> El front pega contra el **BFF**, no directo contra nuestro servicio. El **enriquecimiento con
> datos ajenos (monedas, perfil) lo hace el BFF** — nosotros solo exponemos datos propios.
>
> **Nuestra identidad en la plataforma:** repo `tpi-roadmap` · `spring.application.name =
> roadmap-service` · prefijo externo **`/api/roadmap/**`**. El Gateway valida el token (401) y
> nosotros decidimos el negocio: rol, pertenencia y ownership (403). Detalle en `06-contrato-api.md` §0.

### Consultas síncronas que iniciamos (vía API Gateway) — solo para *nuestra* lógica

| Tema | Grupo | Qué pedimos |
|---|---|---|
| 12 · Backoffice | G6 | Parámetros PAR-01, 02, 05, 06, 08, 09, 12 |
| 04 · Encuestas | G4 | Marcador binario de cumplimiento de la encuesta de cierre |
| 02 · Cursos | G1 | Inscriptos activos (para saber si aplican las zonas P90/P10) |

> **Identidad (avatar/nombre/legajo) y Banco (monedas) ya no los consultamos nosotros** — eso lo
> agrega el **BFF** al armar la pantalla. Ver `06-contrato-api.md` §6.2.

### Consultas síncronas que respondemos

| Tema | Grupo | Qué responden |
|---|---|---|
| 02 · Cursos | G1 | Confirmación de estado académico final — **precondición bloqueante** para archivar |
| — | BFF | Nuestros endpoints crudos de roadmap / progreso / XP / ranking, para que los consolide |

### Eventos que escuchamos (Kafka)

- `DesafioCompletadoEvent` — Motor de Desafíos (Tema 03, G9)
- `CursoArchivadoEvent` — Cursos (Tema 02, G1) → congela Roadmap y Ranking en modo lectura

### Eventos que emitimos (Kafka)

- Entrada / salida de zona **P90 o P10** → Notificaciones (Tema 11)

> **Reglas no negociables de plataforma:** toda comunicación síncrona sale y vuelve por el
> **API Gateway**. Nadie lee la base de otro servicio. Lo asincrónico viaja por **Kafka**,
> no por el gateway. Toda entidad propia lleva `curso_cohorte_id`.

---

## 6. Dudas abiertas que bloquean requerimientos

Estas condicionan cómo se escriben las Historias de Usuario. Hay que cerrarlas con la cátedra:

1. **Alcance de "Vidas"** — no figura en el resumen oficial del Tema 10, pero la arquitectura las asigna a nuestro tema y el Tema 03 lo dice explícitamente. ¿Confirmamos que son núcleo nuestro, o se recortan del MVP? Bloquea las épicas E5 y parte del ranking (RF-RNK-05 usa `vidas_perdidas_historico`).
1. **Rol "responsable"** — aparece en la propuesta de arquitectura sin definición. Bloquea la matriz de permisos completa.
2. **Insignias** — tres preguntas encadenadas (ver 3.5): (a) ¿el otorgamiento por desafío viaja dentro del `DesafioCompletadoEvent` o es un evento propio? (b) ¿las insignias son siempre **por curso-cohorte** o existe una capa de logros global que hoy nadie posee? (c) ¿quién emite el hecho de los disparadores externos como "días conectados" — Identidad o Social?
3. **Dueño del pool de recuperación de vida** — ¿Roadmap o Motor de Desafíos? **Implementado
   asumiendo que es Roadmap** (`DesafioRecuperacionEntity`, por coherencia con cómo ya
   referenciamos `desafio_id` en `RoadmapNodo`) — es una decisión nuestra, no una
   confirmación del equipo. Si la cátedra o Motor de Desafíos dicen lo contrario, el cambio
   se limita a esa tabla y a `IniciarRecuperacionUseCase`, no al resto del módulo.
4. **Desmatriculación a mitad de cuatrimestre** — qué pasa con el progreso, las vidas y el puesto en el ranking. Afecta a los Temas 02, 08, 09 y 10 a la vez.
5. **Vidas en nodos opcionales** — ¿el consumo de vidas aplica solo a obligatorios o también a opcionales?
6. **`template_id`** — lo usa Cursos pero vive en Roadmap; falta definir el contrato.
7. **Bloqueo con 0 vidas** — ¿lo impide Roadmap (navegación) o Motor de Desafíos (inicio del desafío)?
8. **Bootstrapping de `ProgresoNodo` — resuelto (contrato del evento a confirmar).**
   Ambas mitades están: (a) "cuando una sección se desbloquea" —
   `EvaluarDesbloqueoService` crea las filas en `HABILITADO` para el sucesor directo por
   grafo y para las raíces de la sección siguiente por umbral de XP (RF-CUR-06); (b)
   "cuando un alumno arranca el curso" — `ProcesarAlumnoInscriptoUseCase` consume
   `AlumnoInscriptoEvent` de Cursos (T02) y habilita las raíces de la **primera** sección
   vía `EvaluarDesbloqueoService.habilitarRaicesDeSeccion`. ⚠️ Lo único abierto: el
   nombre/forma de ese evento es una hipótesis (`AlumnoInscriptoEventDto`), a validar con
   el G1 y el Tema 11. Límite conocido: si el alumno se inscribe **antes** de que el
   profesor arme la primera sección, ese caso todavía no re-dispara el desbloqueo.
9. **Contrato de `DesafioCompletadoEvent`** — ⚠️ *surgida al implementar.* El Tema 11 define el
   contrato de eventos real de la plataforma; `DesafioCompletadoEventDto` en nuestro código es
   una **hipótesis de trabajo**, no algo confirmado con el Grupo 9. Validar campos y nombre del
   tópico antes de integrar de verdad.

> **Duda ya cerrada:** un nodo que agota reintentos **no** queda bloqueado para siempre.
> El alumno puede seguir intentando **sobre ese mismo nodo** y pierde 1 vida en cada fallo
> posterior, sin volver a pasar por `habilitado` primero. Lo que se bloquea al llegar a 0
> vidas es el alumno entero (para *cualquier* nodo), no este nodo puntual — y ese bloqueo es
> un gate aparte, no una transición de la máquina de estados del nodo.

---

## 7. Definition of Done

Una Historia de Usuario está *Done* solo si cumple **todo**:

1. Rama propia + Pull Request aprobado por al menos 1 revisor distinto del autor
2. Compila: `ng build` OK · `mvn verify` OK
3. Sin acceso directo a base ajena — todo por API Gateway (sync) o bus (async)
4. Toda entidad propia con `curso_cohorte_id` y borrado lógico (RF-NFR-01)
5. Tests unitarios sobre lo tocado
6. Idempotencia al consumir eventos (dedupe por `origen_evento_id`)
7. Cero parámetros hardcodeados — los PAR-XX se leen en runtime
8. Trazada a su RF — *"si no está trazado, no está hecho"*
9. Desktop-only: en móvil informa *"requiere una computadora"* (RF-NFR-05)
10. Endpoint o evento actualizado en el contrato del equipo
11. Merge sin romper el build general

---

## 8. Documentación de este directorio

| Archivo | Para quién |
|---|---|
| `README.md` | Todo el equipo — empezá por acá |
| [`01-arquitectura-y-stack.md`](01-arquitectura-y-stack.md) | Todo el equipo |
| [`02-modelo-de-datos.md`](02-modelo-de-datos.md) | Todo el equipo |
| [`03-plan-de-implementacion.md`](03-plan-de-implementacion.md) | Todo el equipo |
| [`04-engine-2-5d.md`](04-engine-2-5d.md) | Squad Engine |
| [`05-design-system.md`](05-design-system.md) | Squad UI |
| [`06-contrato-api.md`](06-contrato-api.md) | Squad Backend |
| [`deuda-tecnica/`](deuda-tecnica/README.md) | Todo el equipo — lo que quedó pendiente sin bloquear nada |

---

## 9. Glosario

| Término | Significado |
|---|---|
| **XP** | Puntos de experiencia. Base del ranking. No se gasta |
| **Monedas** | Poder de compra. Viven en el Banco (Tema 08), no acá |
| **P90 / P10** | Percentil 90 (10 % superior) y percentil 10 (10 % inferior) de la distribución de XP del curso |
| **Curso-cohorte** | El dictado concreto de un curso. Casi ninguna entidad existe fuera de uno |
| **Unidad** | Lo que el profesor agrega al curso. En el modelo es una `RoadmapSeccion`. En el mapa es una **isla** |
| **Actividad** | Material o desafío dentro de una unidad. En el modelo es un `RoadmapNodo` |
| **Vidas vigentes** | Sube y baja, con techo (PAR-12) |
| **Vidas perdidas histórico** | Nunca decrece. Es el que usa la validación de promoción (RF-RNK-05) |
| **Insignia / Logro** | Reconocimiento que el alumno *gana* (desafío, racha, hito de XP). La registramos y contamos nosotros. Distinta de la insignia *cosmética* que elige exhibir, que es de Mercado (T09) |
| **Racha** | Serie de ejercicios resueltos sin fallar. En el MVP se cuenta **dentro del curso-cohorte**, no a nivel plataforma |
