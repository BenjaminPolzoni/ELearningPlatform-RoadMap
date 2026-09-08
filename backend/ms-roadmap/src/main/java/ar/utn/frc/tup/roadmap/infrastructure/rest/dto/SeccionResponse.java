package ar.utn.frc.tup.roadmap.infrastructure.rest.dto;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapSeccionEntity;
import java.util.UUID;

public record SeccionResponse(
    UUID id,
    UUID roadmapId,
    String nombre,
    Integer umbralXpDesbloqueo,
    Integer orden
) {
    public static SeccionResponse desde(RoadmapSeccionEntity e) {
        return new SeccionResponse(
            e.getId(), e.getRoadmapId(), e.getNombre(), e.getUmbralXpDesbloqueo(), e.getOrden()
        );
    }
}
