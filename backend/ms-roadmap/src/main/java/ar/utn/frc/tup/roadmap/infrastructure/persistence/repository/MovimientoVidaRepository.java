package ar.utn.frc.tup.roadmap.infrastructure.persistence.repository;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.MovimientoVidaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MovimientoVidaRepository extends JpaRepository<MovimientoVidaEntity, UUID> {

    List<MovimientoVidaEntity> findByAlumnoIdAndCursoCohorteId(UUID alumnoId, UUID cursoCohorteId);
}
