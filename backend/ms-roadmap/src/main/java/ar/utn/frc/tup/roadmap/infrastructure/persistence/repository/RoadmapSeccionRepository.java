package ar.utn.frc.tup.roadmap.infrastructure.persistence.repository;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapSeccionEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoadmapSeccionRepository extends JpaRepository<RoadmapSeccionEntity, UUID> {

    List<RoadmapSeccionEntity> findByRoadmapIdAndActivoTrueOrderByOrdenAsc(UUID roadmapId);

    Optional<RoadmapSeccionEntity> findByIdAndActivoTrue(UUID id);

    /** RF-CUR-06: "sección 2 requiere 500 XP en sección 1" — la que sigue en orden. */
    Optional<RoadmapSeccionEntity> findFirstByRoadmapIdAndOrdenGreaterThanAndActivoTrueOrderByOrdenAsc(
        UUID roadmapId, Integer orden
    );
}
