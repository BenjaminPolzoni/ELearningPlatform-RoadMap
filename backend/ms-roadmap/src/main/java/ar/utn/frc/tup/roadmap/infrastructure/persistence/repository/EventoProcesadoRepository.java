package ar.utn.frc.tup.roadmap.infrastructure.persistence.repository;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.EventoProcesadoEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventoProcesadoRepository extends JpaRepository<EventoProcesadoEntity, UUID> {
}
