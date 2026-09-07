package ar.utn.frc.tup.roadmap.infrastructure.persistence.repository;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.EstadoAcademicoFinalEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EstadoAcademicoFinalRepository extends JpaRepository<EstadoAcademicoFinalEntity, UUID> {

    List<EstadoAcademicoFinalEntity> findByCursoCohorteId(UUID cursoCohorteId);

    Optional<EstadoAcademicoFinalEntity> findByAlumnoIdAndCursoCohorteId(UUID alumnoId, UUID cursoCohorteId);
}
