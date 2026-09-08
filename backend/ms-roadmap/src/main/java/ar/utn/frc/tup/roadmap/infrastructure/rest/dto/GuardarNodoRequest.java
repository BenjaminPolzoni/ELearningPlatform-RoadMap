package ar.utn.frc.tup.roadmap.infrastructure.rest.dto;

import ar.utn.frc.tup.roadmap.domain.model.TipoNodo;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Cuerpo de POST /roadmaps/{cc}/nodos y de PUT /roadmaps/{cc}/nodos/{id} — la misma
 * forma para alta y edición (la edición es un reemplazo completo de atributos).
 *
 * <p>{@code seccionId} viaja siempre: en el alta dice dónde nace el nodo, en la edición
 * permite mover la actividad a otra unidad del mismo roadmap.
 *
 * <p>{@code desafioId} es nulo para {@link TipoNodo#HITO} (marcador sin evaluación) y
 * opcional para el resto — se puede vincular el contenido externo más tarde (Fase 2,
 * "vinculación de desafio_id"). {@code reintentosPermitidos} 0..3 (RF-DES-07, PAR-13).
 */
public record GuardarNodoRequest(
    @NotNull UUID seccionId,
    @NotNull TipoNodo tipo,
    UUID desafioId,
    @NotNull Double posicionX,
    @NotNull Double posicionY,
    Boolean esObligatorio,
    @Min(0) @Max(3) Integer reintentosPermitidos
) {

    /** Default RF-DES-06: un nodo es obligatorio salvo que el profesor diga lo contrario. */
    public boolean esObligatorioOrDefault() {
        return esObligatorio == null || esObligatorio;
    }

    /** Default PAR-13 de referencia: sin reintentos gratis. */
    public int reintentosPermitidosOrDefault() {
        return reintentosPermitidos == null ? 0 : reintentosPermitidos;
    }
}
