package ar.utn.frc.tup.roadmap.infrastructure.persistence.repository;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoadmapRepository extends JpaRepository<RoadmapEntity, UUID> {

    Optional<RoadmapEntity> findByCursoCohorteIdAndActivoTrue(UUID cursoCohorteId);
}
