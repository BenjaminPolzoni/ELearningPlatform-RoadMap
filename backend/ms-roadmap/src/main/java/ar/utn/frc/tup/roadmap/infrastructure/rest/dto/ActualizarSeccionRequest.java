package ar.utn.frc.tup.roadmap.infrastructure.rest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

/**
 * PUT /roadmaps/{cc}/secciones/{id} — reemplazo completo de los campos editables
 * (nombre, umbral, orden). No es un PATCH: los tres viajan siempre.
 */
public record ActualizarSeccionRequest(
    @NotBlank String nombre,
    @NotNull @PositiveOrZero Integer umbralXpDesbloqueo,
    @NotNull Integer orden
) {}
