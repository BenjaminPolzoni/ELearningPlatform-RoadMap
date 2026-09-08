package ar.utn.frc.tup.roadmap.infrastructure.persistence.repository;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.MovimientoXpEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MovimientoXpRepository extends JpaRepository<MovimientoXpEntity, UUID> {

    List<MovimientoXpEntity> findByAlumnoIdAndCursoCohorteId(UUID alumnoId, UUID cursoCohorteId);

    /** Idempotencia al consumir eventos del bus — dedupe por origen_evento_id (§5 del contrato). */
    boolean existsByOrigenEventoId(UUID origenEventoId);

    /** XP acumulado por el alumno específicamente en los nodos dados (RF-CUR-06). */
    @Query("""
        SELECT COALESCE(SUM(m.monto), 0) FROM MovimientoXpEntity m
        WHERE m.alumnoId = :alumnoId AND m.nodoId IN :nodoIds
        """)
    int sumarMontoPorAlumnoYNodos(@Param("alumnoId") UUID alumnoId, @Param("nodoIds") List<UUID> nodoIds);
}
