package ar.utn.frc.tup.roadmap.infrastructure.persistence.repository;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.CursoCohorteContextoEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CursoCohorteContextoRepository extends JpaRepository<CursoCohorteContextoEntity, UUID> {

    Optional<CursoCohorteContextoEntity> findByCursoCohorteId(UUID cursoCohorteId);
}
