package ar.utn.frc.tup.roadmap.infrastructure.rest.dto;

import ar.utn.frc.tup.roadmap.domain.model.TipoNodo;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapNodoEntity;
import java.util.UUID;

public record NodoResponse(
    UUID id,
    UUID seccionId,
    TipoNodo tipo,
    UUID desafioId,
    Double posicionX,
    Double posicionY,
    boolean esObligatorio,
    Integer reintentosPermitidos
) {
    public static NodoResponse desde(RoadmapNodoEntity e) {
        return new NodoResponse(
            e.getId(), e.getSeccionId(), e.getTipo(), e.getDesafioId(),
            e.getPosicionX(), e.getPosicionY(), e.isEsObligatorio(), e.getReintentosPermitidos()
        );
    }
}
