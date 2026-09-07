package ar.utn.frc.tup.roadmap.infrastructure.persistence.entity;

import ar.utn.frc.tup.roadmap.domain.model.EstadoAcademico;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * ⚠️ Alcance a confirmar — ver path/README.md §1.2. El estado académico final que el
 * PROFESOR confirma a mano al cierre (RF-RNK-10). Es la precondición que Cursos consulta
 * antes de archivar — Roadmap no ejecuta el archivado en sí.
 */
@Getter
@Setter
@Entity
@Table(
    name = "estado_academico_final",
    uniqueConstraints = @UniqueConstraint(columnNames = {"alumno_id", "curso_cohorte_id"})
)
public class EstadoAcademicoFinalEntity extends EntidadBase {

    @Column(name = "alumno_id", nullable = false)
    private UUID alumnoId;

    @Column(name = "curso_cohorte_id", nullable = false)
    private UUID cursoCohorteId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoAcademico estado;

    @Column(name = "confirmado_por", nullable = false)
    private UUID confirmadoPor;

    @Column(name = "confirmado_en", nullable = false)
    private Instant confirmadoEn;
}
