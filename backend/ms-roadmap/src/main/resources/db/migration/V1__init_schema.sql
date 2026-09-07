-- ============================================================================
-- V1 — Esquema inicial de roadmap-service (Tema 10 · Grupo 10)
-- Espejo exacto de las entidades JPA en infrastructure.persistence.entity.
-- Ver path/02-modelo-de-datos.md para el porqué de cada decisión de modelado.
--
-- Regla de plataforma: esta es la ÚNICA base que este servicio toca. Nadie más
-- la lee ni la escribe directamente (Sección 1.1 de la propuesta de arquitectura).
-- ============================================================================

-- ── Grafo del roadmap ────────────────────────────────────────────────────

CREATE TABLE roadmap (
    id                 UUID PRIMARY KEY,
    curso_cohorte_id   UUID NOT NULL UNIQUE,
    estado             VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
    creado_en          TIMESTAMPTZ NOT NULL,
    actualizado_en     TIMESTAMPTZ NOT NULL,
    activo             BOOLEAN NOT NULL DEFAULT TRUE,
    baja_en            TIMESTAMPTZ
);

CREATE TABLE roadmap_seccion (
    id                     UUID PRIMARY KEY,
    roadmap_id             UUID NOT NULL REFERENCES roadmap(id),
    nombre                 VARCHAR(200) NOT NULL,
    umbral_xp_desbloqueo   INTEGER NOT NULL,
    orden                  INTEGER NOT NULL,
    creado_en              TIMESTAMPTZ NOT NULL,
    actualizado_en         TIMESTAMPTZ NOT NULL,
    activo                 BOOLEAN NOT NULL DEFAULT TRUE,
    baja_en                TIMESTAMPTZ
);
CREATE INDEX idx_roadmap_seccion_roadmap ON roadmap_seccion(roadmap_id);

CREATE TABLE roadmap_nodo (
    id                     UUID PRIMARY KEY,
    seccion_id             UUID NOT NULL REFERENCES roadmap_seccion(id),
    tipo                   VARCHAR(30) NOT NULL,
    desafio_id             UUID,
    posicion_x             DOUBLE PRECISION NOT NULL,
    posicion_y             DOUBLE PRECISION NOT NULL,
    es_obligatorio         BOOLEAN NOT NULL DEFAULT TRUE,
    reintentos_permitidos  INTEGER NOT NULL DEFAULT 0,
    creado_en              TIMESTAMPTZ NOT NULL,
    actualizado_en         TIMESTAMPTZ NOT NULL,
    activo                 BOOLEAN NOT NULL DEFAULT TRUE,
    baja_en                TIMESTAMPTZ,
    CONSTRAINT chk_reintentos_rango CHECK (reintentos_permitidos BETWEEN 0 AND 3)
);
CREATE INDEX idx_roadmap_nodo_seccion ON roadmap_nodo(seccion_id);

CREATE TABLE roadmap_conexion (
    id               UUID PRIMARY KEY,
    roadmap_id       UUID NOT NULL REFERENCES roadmap(id),
    nodo_origen_id   UUID NOT NULL REFERENCES roadmap_nodo(id),
    nodo_destino_id  UUID NOT NULL REFERENCES roadmap_nodo(id),
    creado_en        TIMESTAMPTZ NOT NULL,
    actualizado_en   TIMESTAMPTZ NOT NULL,
    activo           BOOLEAN NOT NULL DEFAULT TRUE,
    baja_en          TIMESTAMPTZ
);
CREATE INDEX idx_roadmap_conexion_roadmap ON roadmap_conexion(roadmap_id);

-- ── Progreso, XP y vidas ─────────────────────────────────────────────────

CREATE TABLE progreso_nodo (
    id               UUID PRIMARY KEY,
    alumno_id        UUID NOT NULL,
    curso_cohorte_id UUID NOT NULL,
    nodo_id          UUID NOT NULL REFERENCES roadmap_nodo(id),
    estado           VARCHAR(20) NOT NULL DEFAULT 'BLOQUEADO',
    intentos_usados  INTEGER NOT NULL DEFAULT 0,
    completado_en    TIMESTAMPTZ,
    creado_en        TIMESTAMPTZ NOT NULL,
    actualizado_en   TIMESTAMPTZ NOT NULL,
    activo           BOOLEAN NOT NULL DEFAULT TRUE,
    baja_en          TIMESTAMPTZ,
    CONSTRAINT uq_progreso_alumno_nodo UNIQUE (alumno_id, nodo_id)
);
CREATE INDEX idx_progreso_nodo_alumno_curso ON progreso_nodo(alumno_id, curso_cohorte_id);

-- Append-only: sin activo/baja_en — ver MovimientoBase.java para el porqué.
CREATE TABLE movimiento_xp (
    id               UUID PRIMARY KEY,
    alumno_id        UUID NOT NULL,
    curso_cohorte_id UUID NOT NULL,
    nodo_id          UUID,
    tipo             VARCHAR(30) NOT NULL,
    monto            INTEGER NOT NULL,
    rubric_version   VARCHAR(50),
    origen_evento_id UUID,
    registrado_en    TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_movimiento_xp_origen_evento UNIQUE (origen_evento_id)
);
CREATE INDEX idx_movimiento_xp_alumno_curso ON movimiento_xp(alumno_id, curso_cohorte_id);

CREATE TABLE movimiento_vida (
    id               UUID PRIMARY KEY,
    alumno_id        UUID NOT NULL,
    curso_cohorte_id UUID NOT NULL,
    nodo_id          UUID,
    tipo             VARCHAR(20) NOT NULL,
    origen_evento_id UUID,
    registrado_en    TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_movimiento_vida_alumno_curso ON movimiento_vida(alumno_id, curso_cohorte_id);

-- Patrón Inbox: gate único de idempotencia para todo consumidor de eventos del bus,
-- independiente de qué llegue a escribir el use case (ver EventoProcesadoEntity.java).
CREATE TABLE evento_procesado (
    origen_evento_id UUID PRIMARY KEY,
    procesado_en     TIMESTAMPTZ NOT NULL
);

-- ── Niveles, insignias, cierre ───────────────────────────────────────────

CREATE TABLE nivel_definicion (
    id               UUID PRIMARY KEY,
    curso_cohorte_id UUID NOT NULL,
    nombre           VARCHAR(100) NOT NULL,
    umbral_xp        INTEGER NOT NULL,
    orden            INTEGER NOT NULL,
    creado_en        TIMESTAMPTZ NOT NULL,
    actualizado_en   TIMESTAMPTZ NOT NULL,
    activo           BOOLEAN NOT NULL DEFAULT TRUE,
    baja_en          TIMESTAMPTZ
);
CREATE INDEX idx_nivel_definicion_curso ON nivel_definicion(curso_cohorte_id);

-- Append-only — ver comentario en movimiento_xp.
CREATE TABLE insignia_otorgada (
    id               UUID PRIMARY KEY,
    alumno_id        UUID NOT NULL,
    curso_cohorte_id UUID NOT NULL,
    insignia_id      UUID NOT NULL,
    origen_evento_id UUID,
    registrado_en    TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_insignia_otorgada_alumno_curso ON insignia_otorgada(alumno_id, curso_cohorte_id);

CREATE TABLE estado_academico_final (
    id               UUID PRIMARY KEY,
    alumno_id        UUID NOT NULL,
    curso_cohorte_id UUID NOT NULL,
    estado           VARCHAR(20) NOT NULL,
    confirmado_por   UUID NOT NULL,
    confirmado_en    TIMESTAMPTZ NOT NULL,
    creado_en        TIMESTAMPTZ NOT NULL,
    actualizado_en   TIMESTAMPTZ NOT NULL,
    activo           BOOLEAN NOT NULL DEFAULT TRUE,
    baja_en          TIMESTAMPTZ,
    CONSTRAINT uq_estado_academico_alumno_curso UNIQUE (alumno_id, curso_cohorte_id)
);

-- ── Caches externos — NO somos dueños de este dato, solo copia local ────

CREATE TABLE curso_cohorte_contexto (
    id                  UUID PRIMARY KEY,
    curso_cohorte_id    UUID NOT NULL UNIQUE,
    estado              VARCHAR(20) NOT NULL,
    inscriptos_activos  INTEGER NOT NULL DEFAULT 0,
    creado_en           TIMESTAMPTZ NOT NULL,
    actualizado_en      TIMESTAMPTZ NOT NULL,
    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    baja_en             TIMESTAMPTZ
);

-- ⚠️ Redundante a confirmar — ver AlumnoPerfilCacheEntity.java y 06-contrato-api.md §6.2.
CREATE TABLE alumno_perfil_cache (
    id               UUID PRIMARY KEY,
    alumno_id        UUID NOT NULL UNIQUE,
    avatar_url       VARCHAR(500),
    nombre           VARCHAR(150),
    apellido         VARCHAR(150),
    legajo           VARCHAR(50),
    baja_logica      BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en        TIMESTAMPTZ NOT NULL,
    actualizado_en   TIMESTAMPTZ NOT NULL,
    activo           BOOLEAN NOT NULL DEFAULT TRUE,
    baja_en          TIMESTAMPTZ
);

-- ── Nota sobre las vistas (RankingEntrada, VidasEstado) ──────────────────
-- Documentadas como "vista calculada" / "vista materializada" en el modelo
-- (path/02-modelo-de-datos.md §3). Se recalculan a partir de las tablas de
-- arriba en cada evento relevante — no son tablas propias y no se crean acá.
-- Implementación (query en caliente vs. MATERIALIZED VIEW real) es decisión
-- de Fase 3, cuando el motor de ranking exista.
