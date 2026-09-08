package ar.utn.frc.tup.roadmap.infrastructure.persistence.repository;

import ar.utn.frc.tup.roadmap.domain.model.TipoMovimientoVida;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.MovimientoVidaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MovimientoVidaRepository extends JpaRepository<MovimientoVidaEntity, UUID> {

    List<MovimientoVidaEntity> findByAlumnoIdAndCursoCohorteId(UUID alumnoId, UUID cursoCohorteId);

    /** Orden cronológico — {@link ar.utn.frc.tup.roadmap.domain.service.MotorVidas} lo exige así. */
    List<MovimientoVidaEntity> findByAlumnoIdAndCursoCohorteIdOrderByRegistradoEnAsc(
        UUID alumnoId, UUID cursoCohorteId
    );

    /** RF-REC-06: qué desafíos del pool ya resolvió, para no repetírselos mientras haya otros. */
    @Query("""
        SELECT m.desafioRecuperacionId FROM MovimientoVidaEntity m
        WHERE m.alumnoId = :alumnoId AND m.cursoCohorteId = :cursoCohorteId
        AND m.tipo = :tipo AND m.desafioRecuperacionId IS NOT NULL
        """)
    List<UUID> findDesafiosRecuperacionResueltos(
        @Param("alumnoId") UUID alumnoId,
        @Param("cursoCohorteId") UUID cursoCohorteId,
        @Param("tipo") TipoMovimientoVida tipo
    );
}
