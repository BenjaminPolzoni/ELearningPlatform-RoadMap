# 03 · Plan de implementación

## 1. Decisiones que enmarcan el plan

| Decisión | Elegido |
|---|---|
| **Alcance de esta entrega** | Front mock + esqueleto de backend **en paralelo** |
| **Mapa de islas** | Pixel-art **2.5D con sprites**, cámara ortográfica |
| **Mapa interno de unidad** | **2D con SVG/Canvas** + daisyUI, estilo Mario 3 |
| **Prioridad de la demo** | Editor y mapa **en paralelo**, apoyados en el curso seed |

> **Núcleo vs. extra (ver `README.md` §1.1).** El corte oficial marca como **núcleo obligatorio**
> la capa de datos: grafo, prerequisitos/desbloqueo, XP, niveles y logros. El **mapa 2.5D** y las
> **comparativas de cohorte (ranking)** son **EXTRA**. Este plan igual los construye en paralelo
> porque son el eje visual de la demo, pero si hay que recortar por tiempo, **se sacrifica el
> pulido del extra antes que el núcleo de datos** — nunca al revés.

---

## 2. Reparto del equipo (9 personas)

| Squad | Personas | Frente | Lee |
|---|---|---|---|
| **Engine** | 2 | three.js: escena, cámara ortográfica, layout procedural, sprites, bloom | `04-engine-2-5d.md` |
| **Editor** | 2 | CRUD de unidades y actividades, formularios, preview en vivo, pantalla de cierre | `02`, `05` |
| **UI / Design** | 2 | Tema arcade, `shared/ui`, HUD, ranking, mapa interno SVG | `05-design-system.md` |
| **Backend** | 3 | Boot 4 + Postgres + Docker + gateway + OpenAPI | `06-contrato-api.md` |

**Lo que desacopla a los 4 squads** es el curso seed + el `RoadmapDataPort`: nadie espera a nadie.

---

## 3. Fase 0 — Fundaciones

> **Objetivo:** que cualquier integrante clone el repo, corra un comando y vea algo.

### Repositorio
- [ ] `git init`, `.gitignore` (Node, Java, IDE), estructura de carpetas
- [ ] Ramas protegidas: `main` ← `develop` ← `feature/*`
- [ ] Plantilla de Pull Request con el checklist de la DoD

### Frontend
- [ ] `ng new frontend --style css` con Angular 22
- [ ] Tailwind 4 + daisyUI 5 + `.postcssrc.json` (pasos exactos en `01-arquitectura-y-stack.md`)
- [ ] **Tema arcade custom** — claro y oscuro, derivados de `Fotos_y_conceptos/`
- [ ] Shell: layout, navbar, selector de tema, guard desktop-only (RF-NFR-05)
- [ ] Login mock con **selector de rol** (PROFESOR / ALUMNO / ADMIN)
- [ ] `RoadmapDataPort` + `InMemoryRoadmapAdapter`
- [ ] **Seed del curso de ejemplo** — 4 unidades, ~6 actividades c/u, 12 alumnos

### Backend
- [ ] Esqueleto `ms-roadmap` con Boot 4.1.1 + Java 21
- [ ] Esqueleto `gateway` con Spring Cloud Gateway
- [ ] Entidades JPA del modelo propio + migraciones (Flyway)
- [ ] `docker-compose.yml`: frontend + gateway + ms-roadmap + postgres
- [ ] Dockerfiles multi-stage (el build no depende del JDK local)
- [ ] **OpenAPI v0** en `docs/openapi/ms-roadmap.yaml`

**Sale de esta fase:** `docker compose up` levanta el stack, el front muestra el shell con el
tema arcade y el curso seed cargado en memoria.

---

## 4. Fase 1 — Vertical slice visible

> **Objetivo:** el profesor agrega una unidad y aparece una isla nueva en el mapa. Ese es el
> momento que hay que llegar a mostrar.

### Squad Editor
- [ ] Pantalla de gestión del curso — layout serio y denso, pensado para navegabilidad
- [ ] **CRUD de unidades**: alta, edición, reordenamiento, baja lógica
- [ ] Campos por unidad: nombre, `umbral_xp_desbloqueo` (default PAR-08), orden
- [ ] Validaciones y sugerencias de buenas prácticas de gamificación (RF-CUR-07)
- [ ] Preview en vivo: el mapa se actualiza mientras se edita

### Squad Engine
- [ ] Escena three.js con `OrthographicCamera` en ángulo isométrico
- [ ] **Layout procedural sobre spline serpenteante** — N unidades se acomodan solas
- [ ] Islas como quads texturizados con **placeholders** (programmer-art)
- [ ] Caminos neón generados en engine + bloom aditivo
- [ ] Paneo horizontal de cámara + botón *"siguiente zona"*
- [ ] Click en isla → entra a la unidad

### Squad UI
- [ ] `shared/ui`: botones, cards, modales, badges — con estados normal/hover/pressed/disabled
- [ ] **HUD del alumno**: avatar, barra de XP, nivel, corazones de vidas
- [ ] Estados visuales de nodo: bloqueado · habilitado · completado · fallado

### Squad Backend
- [ ] Endpoints del grafo: crear roadmap, CRUD de secciones y nodos, conexiones
- [ ] Persistencia real contra Postgres
- [ ] Tests unitarios del dominio

**Sale de esta fase:** demo end-to-end del mock — agrego unidad en el editor, aparece la isla.

---

## 5. Fase 2 — Profundidad

> **Objetivo:** que el mapa tenga reglas, no solo dibujo.

### Squad Editor
- [ ] **CRUD de actividades** dentro de la unidad: tipo, `es_obligatorio`, `reintentos_permitidos` (0-3)
- [ ] Vinculación de `desafio_id` externo (con catálogo stub del Tema 03)
- [ ] Editor de conexiones entre actividades (prerequisitos)
- [ ] Pool de actividades de recuperación por curso (RF-REC-06)

### Squad UI
- [ ] **Mapa interno de unidad** en SVG/Canvas, estilo Mario 3
- [ ] Avatar que se mueve por los caminos entre nodos, **linealmente**
- [ ] Panel de material teórico / práctico (contenido stub)
- [ ] Modal de bloqueo *"sin vidas"* + acceso al desafío de recuperación

### Squad Engine
- [ ] Estados de isla: bloqueada (candado) · disponible · completada
- [ ] Transición isla → unidad
- [ ] Marcador de posición actual del alumno sobre la isla

### Squad Backend
- [ ] **Motor de XP como historial** de `MovimientoXP` (RF-CFG-06)
- [ ] **Motor de vidas**: `vidas_vigentes` vs `vidas_perdidas_historico` (PAR-12)
- [ ] **Máquina de estados del nodo** con la regla de reintentos (RF-DES-07)
- [ ] **Motor de desbloqueo** por umbral de XP de sección (RF-CUR-06)
- [ ] Niveles derivados de XP, máximo 10 (RF-NIV-04, PAR-09)
- [ ] Consumidor idempotente de `DesafioCompletadoEvent` (dedupe por `origen_evento_id`)

**Sale de esta fase:** el alumno no puede saltear unidades ni nodos, y perder vidas tiene consecuencia.

---

## 6. Fase 3 — Cierre

> **Objetivo:** arte real, ranking y backend cableado.

### Arte
- [ ] Swap de placeholders por el set de sprites definitivo
- [ ] Ajuste de bloom, luces y paleta sobre arte real

### Ranking (UI + Backend)
- [ ] Tabla de posiciones con la vista filtrada del alumno (RF-RNK-03)
- [ ] Percentiles P90/P10 solo con ≥ 10 inscriptos (RF-RNK-09)
- [ ] Resalte verde P90 / rojo P10
- [ ] Cascada de desempate (RF-RNK-11)
- [ ] Detalle de fila con visibilidad diferenciada (RF-RNK-07)

### Cierre de curso
- [ ] Pantalla de confirmación de estado académico final (RF-RNK-10)
- [ ] Exportación del reporte de cierre (RF-RNK-13)
- [ ] Bloqueo por encuesta pendiente (RF-ENC-11) y por scores diferidos (RF-IA-34)

### Integración
- [ ] Swap de `InMemoryRoadmapAdapter` → `HttpRoadmapAdapter`
- [ ] Front → Gateway → ms-roadmap → Postgres, end-to-end
- [ ] Emisión del evento de entrada/salida de zona P90/P10
- [ ] Suscripción al evento de curso archivado → modo lectura (RF-CUR-09)

---

## 7. Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| **1** | **Assets pixel-art.** Elegimos sprites y no los tenemos | Arrancar con programmer-art: el engine y el layout se construyen igual. Base **CC0 (Kenney.nl)** — cero riesgo de licencia para una entrega de facultad. El neón lo pone el engine (bloom), no el sprite |
| 2 | Performance de three.js con muchas islas | Sprites en un solo atlas, instancing, `frustumCulled`. Objetivo: 60 fps con 12 unidades |
| 3 | Dependencia de otros grupos (T01, T02, T03, T12) | Contratos stub desde el día 1. El mock nunca se bloquea por otro equipo |
| 4 | Dudas abiertas del PRD (rol *responsable*, insignias, desmatriculación) | Documentadas en el README. Se asume el caso más simple y se marca con `TODO:` en el código |
| 5 | 9 personas sobre un mismo repo | Cada squad dueño de su carpeta, PR obligatorio, ramas protegidas |
| 6 | Java 8 local | El build corre en Docker con Temurin 21. Se instala JDK 21 local solo para el IDE |

---

## 8. Criterio de "listo para mostrar"

La demo a la cátedra tiene que poder recorrer esto sin tocar código:

1. Entro como **PROFESOR** → creo una unidad nueva → **aparece la isla en el mapa**
2. Agrego actividades a esa unidad (teoría, práctica, desafío, boss)
3. Cambio a **ALUMNO** → veo el mapa con las unidades bloqueadas y desbloqueadas
4. Entro a la primera unidad → recorro los nodos **linealmente**
5. Fallo un desafío hasta agotar reintentos → **pierdo una vida**
6. Llego a 0 vidas → aparece el **desafío de recuperación**
7. Veo el **ranking** con mi vista filtrada y las zonas P90/P10
8. Vuelvo como PROFESOR → **pantalla de cierre** con candidatos y exportación

---

## 9. Próximo paso inmediato

1. Instalar **Eclipse Temurin 21** (para el IDE)
2. Confirmar la vía de assets (ver Riesgo 1)
3. Arrancar **Fase 0** por el frontend: `ng new` + Tailwind + daisyUI + tema arcade
