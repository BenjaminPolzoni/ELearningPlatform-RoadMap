package ar.utn.frc.tup.roadmap.infrastructure.persistence.repository;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.NivelDefinicionEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NivelDefinicionRepository extends JpaRepository<NivelDefinicionEntity, UUID> {

    List<NivelDefinicionEntity> findByCursoCohorteIdAndActivoTrueOrderByOrdenAsc(UUID cursoCohorteId);
}
