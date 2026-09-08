package ar.utn.frc.tup.roadmap.domain.exception;

import java.util.UUID;

/** RF-REC-06: el profesor todavía no cargó ningún desafío de recuperación para el curso. */
public class PoolRecuperacionVacioException extends RuntimeException {

    public PoolRecuperacionVacioException(UUID cursoCohorteId) {
        super("El curso " + cursoCohorteId + " no tiene desafíos de recuperación cargados");
    }
}
