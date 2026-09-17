package ar.utn.frc.tup.roadmap.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * Ledger append-only de lecturas. No extiende EntidadBase: una lectura histórica se
 * conserva aunque el contenido deje de estar disponible.
 */
@Getter
@Setter
@Entity
@Table(
    name = "lectura_contenido",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_lectura_contenido_alumno_cc_nodo",
        columnNames = {"alumno_id", "curso_cohorte_id", "nodo_id"}
    )
)
public class LecturaContenidoEntity extends MovimientoBase {

    @Column(name = "alumno_id", nullable = false)
    private UUID alumnoId;

    @Column(name = "curso_cohorte_id", nullable = false)
    private UUID cursoCohorteId;

    @Column(name = "nodo_id", nullable = false)
    private UUID nodoId;
}
