package ar.utn.frc.tup.roadmap.infrastructure.rest.dto;

import ar.utn.frc.tup.roadmap.domain.model.EstadoRoadmap;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapEntity;
import java.time.Instant;
import java.util.UUID;

public record RoadmapResponse(
    UUID id,
    UUID cursoCohorteId,
    EstadoRoadmap estado,
    Instant creadoEn,
    Instant actualizadoEn
) {
    public static RoadmapResponse desde(RoadmapEntity entity) {
        return new RoadmapResponse(
            entity.getId(),
            entity.getCursoCohorteId(),
            entity.getEstado(),
            entity.getCreadoEn(),
            entity.getActualizadoEn()
        );
    }
}
