package ar.utn.frc.tup.roadmap.infrastructure.rest.dto;

import ar.utn.frc.tup.roadmap.domain.service.CurvaNiveles;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Cuerpo de {@code POST /roadmaps/{cc}/niveles} (RF-NIV-04). El {@code orden} lo asigna el
 * servidor por umbral ascendente — el cliente solo manda nombre y umbral.
 */
public record DefinirNivelesRequest(
    @NotEmpty
    @Size(max = CurvaNiveles.MAX_NIVELES, message = "máximo 10 niveles por curso (RF-NIV-04)")
    @Valid
    List<Item> niveles
) {

    public record Item(
        @NotBlank String nombre,
        @PositiveOrZero int umbralXp
    ) {}

    public List<CurvaNiveles.Definicion> aDefiniciones() {
        return niveles.stream()
            .map(i -> new CurvaNiveles.Definicion(i.nombre(), i.umbralXp()))
            .toList();
    }
}
