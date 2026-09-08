package ar.utn.frc.tup.roadmap.infrastructure.rest.dto;

import ar.utn.frc.tup.roadmap.domain.model.EstadoAcademico;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

/** POST /roadmaps/{cc}/cierre/confirmar — el PROFESOR confirma el estado final de N alumnos. */
public record ConfirmarCierreRequest(
    @NotEmpty List<@NotNull Item> items
) {
    public record Item(@NotNull UUID alumnoId, @NotNull EstadoAcademico estado) {}
}
