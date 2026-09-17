-- Lecturas append-only: una por alumno, curso-cohorte y nodo.
CREATE TABLE lectura_contenido (
    id               UUID PRIMARY KEY,
    alumno_id        UUID NOT NULL,
    curso_cohorte_id UUID NOT NULL,
    nodo_id          UUID NOT NULL REFERENCES roadmap_nodo(id),
    registrado_en    TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_lectura_contenido_alumno_cc_nodo
        UNIQUE (alumno_id, curso_cohorte_id, nodo_id)
);

CREATE INDEX idx_lectura_contenido_alumno_curso
    ON lectura_contenido(alumno_id, curso_cohorte_id);
