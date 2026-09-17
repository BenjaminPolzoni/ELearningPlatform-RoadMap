package ar.utn.frc.tup.roadmap.infrastructure.rest.dto;

import java.time.Instant;
import java.util.UUID;

public record LecturaContenidoResponse(
    UUID alumnoId,
    UUID cursoCohorteId,
    UUID nodoId,
    Instant registradoEn,
    boolean nueva
) {}
