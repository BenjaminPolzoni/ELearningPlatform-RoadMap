package ar.utn.frc.tup.roadmap.infrastructure.persistence.repository;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.MovimientoXpEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MovimientoXpRepository extends JpaRepository<MovimientoXpEntity, UUID> {

    List<MovimientoXpEntity> findByAlumnoIdAndCursoCohorteId(UUID alumnoId, UUID cursoCohorteId);

    /** Idempotencia al consumir eventos del bus — dedupe por origen_evento_id (§5 del contrato). */
    boolean existsByOrigenEventoId(UUID origenEventoId);
}
