package ar.utn.frc.tup.roadmap.infrastructure.rest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

/**
 * POST /roadmaps/{cc}/secciones — la "unidad" / isla (RF-CUR-06). El
 * {@code umbralXpDesbloqueo} default de referencia es PAR-08, pero el PROFESOR lo fija
 * por sección; acá siempre viaja explícito.
 */
public record CrearSeccionRequest(
    @NotBlank String nombre,
    @NotNull @PositiveOrZero Integer umbralXpDesbloqueo,
    @NotNull Integer orden
) {}
