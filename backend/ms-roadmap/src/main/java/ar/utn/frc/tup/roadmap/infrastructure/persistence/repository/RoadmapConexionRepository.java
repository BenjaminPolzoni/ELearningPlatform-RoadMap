package ar.utn.frc.tup.roadmap.infrastructure.persistence.repository;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapConexionEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoadmapConexionRepository extends JpaRepository<RoadmapConexionEntity, UUID> {

    List<RoadmapConexionEntity> findByRoadmapIdAndActivoTrue(UUID roadmapId);

    /** Sucesores directos de un nodo — candidatos a evaluar cuando ese nodo se completa. */
    List<RoadmapConexionEntity> findByNodoOrigenIdAndActivoTrue(UUID nodoOrigenId);

    /** Prerequisitos de un nodo — puede haber más de uno (nodo de fusión en el grafo). */
    List<RoadmapConexionEntity> findByNodoDestinoIdAndActivoTrue(UUID nodoDestinoId);
}
