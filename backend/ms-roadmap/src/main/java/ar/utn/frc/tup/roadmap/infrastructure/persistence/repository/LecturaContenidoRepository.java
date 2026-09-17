package ar.utn.frc.tup.roadmap.infrastructure.persistence.repository;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.LecturaContenidoEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LecturaContenidoRepository extends JpaRepository<LecturaContenidoEntity, UUID> {

    Optional<LecturaContenidoEntity> findByAlumnoIdAndCursoCohorteIdAndNodoId(
        UUID alumnoId, UUID cursoCohorteId, UUID nodoId
    );

    List<LecturaContenidoEntity> findByAlumnoIdAndCursoCohorteIdAndNodoIdIn(
        UUID alumnoId, UUID cursoCohorteId, List<UUID> nodoIds
    );
}
