package ar.utn.frc.tup.roadmap.infrastructure.persistence.repository;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapNodoEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoadmapNodoRepository extends JpaRepository<RoadmapNodoEntity, UUID> {

    List<RoadmapNodoEntity> findBySeccionIdAndActivoTrue(UUID seccionId);
}
