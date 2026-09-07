package ar.utn.frc.tup.roadmap.infrastructure.persistence.repository;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapConexionEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoadmapConexionRepository extends JpaRepository<RoadmapConexionEntity, UUID> {

    List<RoadmapConexionEntity> findByRoadmapIdAndActivoTrue(UUID roadmapId);
}
