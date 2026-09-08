package ar.utn.frc.tup.roadmap.infrastructure.persistence.repository;

import java.util.UUID;

/**
 * Proyección de un agregado "por alumno" (suma de XP, conteo de insignias, conteo de
 * vidas perdidas…). Evita traer todas las filas a memoria solo para contarlas.
 */
public interface ConteoPorAlumno {
    UUID getAlumnoId();

    long getTotal();
}
