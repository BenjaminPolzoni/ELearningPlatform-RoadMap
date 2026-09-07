package ar.utn.frc.tup.roadmap.domain.exception;

import java.util.UUID;

public class RoadmapYaExisteException extends RuntimeException {

    public RoadmapYaExisteException(UUID cursoCohorteId) {
        super("Ya existe un roadmap para curso_cohorte_id=" + cursoCohorteId);
    }
}
