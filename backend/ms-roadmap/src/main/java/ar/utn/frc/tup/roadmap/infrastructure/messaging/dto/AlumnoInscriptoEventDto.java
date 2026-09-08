package ar.utn.frc.tup.roadmap.infrastructure.messaging.dto;

import java.util.UUID;

/**
 * ⚠️ CONTRATO ASUMIDO, no confirmado — el alta de un alumno en un curso-cohorte la
 * publica Cursos (T02, G1). Hipótesis de trabajo a validar con ellos y con el Tema 11.
 * Resuelve la mitad "el alumno arranca el curso" de la duda de bootstrapping (README §6.8).
 */
public record AlumnoInscriptoEventDto(
    UUID eventoId,
    UUID alumnoId,
    UUID cursoCohorteId
) {}
