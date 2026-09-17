package ar.utn.frc.tup.roadmap.infrastructure.rest.dto;

import java.util.UUID;

public record AvanceLecturaUnidadResponse(
    UUID unidadId,
    int contenidosObligatorios,
    int contenidosLeidos,
    int porcentaje
) {}
