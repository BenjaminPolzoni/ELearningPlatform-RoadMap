package ar.utn.frc.tup.roadmap.infrastructure.persistence.repository;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapNodoEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoadmapNodoRepository extends JpaRepository<RoadmapNodoEntity, UUID> {

    List<RoadmapNodoEntity> findBySeccionIdAndActivoTrue(UUID seccionId);

    Optional<RoadmapNodoEntity> findByIdAndActivoTrue(UUID id);

    /** Todos los nodos activos de un conjunto de secciones — para armar el grafo del editor. */
    List<RoadmapNodoEntity> findBySeccionIdInAndActivoTrue(List<UUID> seccionIds);

    /**
     * Nodos "raíz" de una sección: sin ninguna conexión entrante activa. Son los que se
     * habilitan directo cuando la SECCIÓN se desbloquea por umbral de XP (RF-CUR-06) —
     * los demás nodos de la sección se habilitan por completar su prerequisito (grafo).
     */
    @Query("""
        SELECT n FROM RoadmapNodoEntity n
        WHERE n.seccionId = :seccionId AND n.activo = true
        AND n.id NOT IN (
            SELECT c.nodoDestinoId FROM RoadmapConexionEntity c WHERE c.activo = true
        )
        """)
    List<RoadmapNodoEntity> findNodosRaizDeSeccion(@Param("seccionId") UUID seccionId);
}
