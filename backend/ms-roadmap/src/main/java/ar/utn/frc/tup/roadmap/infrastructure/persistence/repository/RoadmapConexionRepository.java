package ar.utn.frc.tup.roadmap.infrastructure.persistence.repository;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapConexionEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoadmapConexionRepository extends JpaRepository<RoadmapConexionEntity, UUID> {

    List<RoadmapConexionEntity> findByRoadmapIdAndActivoTrue(UUID roadmapId);

    Optional<RoadmapConexionEntity> findByIdAndActivoTrue(UUID id);

    /** Guardia de duplicados en el alta de conexión (contrato §0.5 → 409). */
    Optional<RoadmapConexionEntity> findByNodoOrigenIdAndNodoDestinoIdAndActivoTrue(
        UUID nodoOrigenId, UUID nodoDestinoId
    );

    /** Baja lógica en cascada: aristas activas que tocan alguno de esos nodos (como origen o destino). */
    @Query("""
        SELECT c FROM RoadmapConexionEntity c
        WHERE c.activo = true
        AND (c.nodoOrigenId IN :nodoIds OR c.nodoDestinoId IN :nodoIds)
        """)
    List<RoadmapConexionEntity> findActivasQueTocan(@Param("nodoIds") List<UUID> nodoIds);

    /** Sucesores directos de un nodo — candidatos a evaluar cuando ese nodo se completa. */
    List<RoadmapConexionEntity> findByNodoOrigenIdAndActivoTrue(UUID nodoOrigenId);

    /** Prerequisitos de un nodo — puede haber más de uno (nodo de fusión en el grafo). */
    List<RoadmapConexionEntity> findByNodoDestinoIdAndActivoTrue(UUID nodoDestinoId);
}
