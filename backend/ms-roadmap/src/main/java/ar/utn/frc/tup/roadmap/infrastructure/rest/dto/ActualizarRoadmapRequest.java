package ar.utn.frc.tup.roadmap.infrastructure.rest.dto;

import ar.utn.frc.tup.roadmap.domain.model.EstadoRoadmap;
import jakarta.validation.constraints.NotNull;

/**
 * PUT /roadmaps/{cc} — hoy lo único editable de la metadata del roadmap es su estado
 * (borrador ↔ publicado). El {@code cursoCohorteId} es inmutable (lo fija Cursos, T02).
 */
public record ActualizarRoadmapRequest(
    @NotNull EstadoRoadmap estado
) {}
