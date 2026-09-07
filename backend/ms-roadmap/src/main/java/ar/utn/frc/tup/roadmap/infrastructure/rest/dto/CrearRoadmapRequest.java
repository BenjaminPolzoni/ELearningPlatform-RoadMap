package ar.utn.frc.tup.roadmap.infrastructure.rest.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * POST /roadmaps — el {@code cursoCohorteId} lo entrega Cursos (Tema 02), ya creado.
 * Nosotros no lo generamos.
 */
public record CrearRoadmapRequest(
    @NotNull UUID cursoCohorteId
) {}
