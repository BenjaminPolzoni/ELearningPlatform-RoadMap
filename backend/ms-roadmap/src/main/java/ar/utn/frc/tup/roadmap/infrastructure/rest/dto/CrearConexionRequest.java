package ar.utn.frc.tup.roadmap.infrastructure.rest.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** POST /roadmaps/{cc}/conexiones — {@code origen} es prerequisito de {@code destino}. */
public record CrearConexionRequest(
    @NotNull UUID nodoOrigenId,
    @NotNull UUID nodoDestinoId
) {}
