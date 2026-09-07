package ar.utn.frc.tup.roadmap.domain.exception;

import java.util.UUID;

/** Sin dependencia de Spring/JPA a propósito — es dominio puro. */
public class RoadmapNoEncontradoException extends RuntimeException {

    public RoadmapNoEncontradoException(UUID cursoCohorteId) {
        super("No existe roadmap activo para curso_cohorte_id=" + cursoCohorteId);
    }
}
