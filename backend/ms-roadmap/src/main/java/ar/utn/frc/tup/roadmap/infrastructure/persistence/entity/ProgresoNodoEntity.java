package ar.utn.frc.tup.roadmap.infrastructure.persistence.entity;

import ar.utn.frc.tup.roadmap.domain.model.EstadoNodo;
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
 * El estado de un nodo para UN alumno puntual. Acá vive la máquina de estados
 * (ver {@link EstadoNodo}). Única entidad "de estado actual" con lógica de transición real.
 */
@Getter
@Setter
@Entity
@Table(
    name = "progreso_nodo",
    uniqueConstraints = @UniqueConstraint(columnNames = {"alumno_id", "nodo_id"})
)
public class ProgresoNodoEntity extends EntidadBase {

    @Column(name = "alumno_id", nullable = false)
    private UUID alumnoId;

    @Column(name = "curso_cohorte_id", nullable = false)
    private UUID cursoCohorteId;

    @Column(name = "nodo_id", nullable = false)
    private UUID nodoId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoNodo estado = EstadoNodo.BLOQUEADO;

    @Column(name = "intentos_usados", nullable = false)
    private Integer intentosUsados = 0;

    @Column(name = "completado_en")
    private Instant completadoEn;
}
