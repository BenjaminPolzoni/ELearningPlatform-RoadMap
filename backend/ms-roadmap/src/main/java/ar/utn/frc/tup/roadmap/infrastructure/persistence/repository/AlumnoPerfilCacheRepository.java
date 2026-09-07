package ar.utn.frc.tup.roadmap.infrastructure.persistence.repository;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.AlumnoPerfilCacheEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlumnoPerfilCacheRepository extends JpaRepository<AlumnoPerfilCacheEntity, UUID> {

    Optional<AlumnoPerfilCacheEntity> findByAlumnoId(UUID alumnoId);
}
