package ar.utn.frc.tup.roadmap.infrastructure.persistence.repository;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.InsigniaOtorgadaEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InsigniaOtorgadaRepository extends JpaRepository<InsigniaOtorgadaEntity, UUID> {

    List<InsigniaOtorgadaEntity> findByAlumnoIdAndCursoCohorteId(UUID alumnoId, UUID cursoCohorteId);

    long countByAlumnoIdAndCursoCohorteId(UUID alumnoId, UUID cursoCohorteId);

    /** Insignias ganadas por alumno del curso — primer criterio de desempate (RF-RNK-11). */
    @Query("""
        SELECT i.alumnoId AS alumnoId, COUNT(i) AS total
        FROM InsigniaOtorgadaEntity i
        WHERE i.cursoCohorteId = :cursoCohorteId
        GROUP BY i.alumnoId
        """)
    List<ConteoPorAlumno> contarPorAlumno(@Param("cursoCohorteId") UUID cursoCohorteId);
}
