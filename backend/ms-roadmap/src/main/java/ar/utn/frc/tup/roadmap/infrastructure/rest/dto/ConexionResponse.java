package ar.utn.frc.tup.roadmap.infrastructure.rest.dto;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapConexionEntity;
import java.util.UUID;

public record ConexionResponse(
    UUID id,
    UUID roadmapId,
    UUID nodoOrigenId,
    UUID nodoDestinoId
) {
    public static ConexionResponse desde(RoadmapConexionEntity e) {
        return new ConexionResponse(
            e.getId(), e.getRoadmapId(), e.getNodoOrigenId(), e.getNodoDestinoId()
        );
    }
}
