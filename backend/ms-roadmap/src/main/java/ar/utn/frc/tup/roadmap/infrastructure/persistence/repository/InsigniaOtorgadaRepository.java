package ar.utn.frc.tup.roadmap.infrastructure.persistence.repository;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.InsigniaOtorgadaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InsigniaOtorgadaRepository extends JpaRepository<InsigniaOtorgadaEntity, UUID> {

    List<InsigniaOtorgadaEntity> findByAlumnoIdAndCursoCohorteId(UUID alumnoId, UUID cursoCohorteId);

    long countByAlumnoIdAndCursoCohorteId(UUID alumnoId, UUID cursoCohorteId);
}
