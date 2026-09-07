package ar.utn.frc.tup.roadmap.infrastructure.persistence.repository;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapSeccionEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoadmapSeccionRepository extends JpaRepository<RoadmapSeccionEntity, UUID> {

    List<RoadmapSeccionEntity> findByRoadmapIdAndActivoTrueOrderByOrdenAsc(UUID roadmapId);
}
