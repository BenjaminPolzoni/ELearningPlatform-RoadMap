package ar.utn.frc.tup.roadmap.infrastructure.persistence.repository;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.ProgresoNodoEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProgresoNodoRepository extends JpaRepository<ProgresoNodoEntity, UUID> {

    List<ProgresoNodoEntity> findByAlumnoIdAndCursoCohorteIdAndActivoTrue(UUID alumnoId, UUID cursoCohorteId);

    Optional<ProgresoNodoEntity> findByAlumnoIdAndNodoId(UUID alumnoId, UUID nodoId);

    /** Para chequear en batch el estado de varios prerequisitos de un nodo a la vez. */
    List<ProgresoNodoEntity> findByAlumnoIdAndNodoIdIn(UUID alumnoId, List<UUID> nodoIds);
}
