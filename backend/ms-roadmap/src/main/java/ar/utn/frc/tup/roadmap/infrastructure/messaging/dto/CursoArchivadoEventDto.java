package ar.utn.frc.tup.roadmap.infrastructure.messaging.dto;

import java.util.UUID;

/**
 * ⚠️ CONTRATO ASUMIDO, no confirmado — mismo caso que {@code DesafioCompletadoEventDto}:
 * hipótesis de trabajo a validar con Cursos (T02, G1) y con el Tema 11.
 *
 * @param inscriptosActivos foto final de inscriptos al archivar — si viene, se guarda en
 *        el cache para el ranking (RF-RNK-09); si es null se deja el valor que ya había.
 */
public record CursoArchivadoEventDto(
    UUID eventoId,
    UUID cursoCohorteId,
    Integer inscriptosActivos
) {}
