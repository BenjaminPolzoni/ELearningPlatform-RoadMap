package ar.utn.frc.tup.roadmap.infrastructure.persistence.repository;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.DesafioRecuperacionEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DesafioRecuperacionRepository extends JpaRepository<DesafioRecuperacionEntity, UUID> {

    List<DesafioRecuperacionEntity> findByCursoCohorteIdAndActivoTrue(UUID cursoCohorteId);
}
