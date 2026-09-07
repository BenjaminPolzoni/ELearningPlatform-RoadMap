package ar.utn.frc.tup.roadmap.infrastructure.persistence.entity;

import ar.utn.frc.tup.roadmap.domain.model.EstadoCursoCohorte;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * Cache externo — NO somos dueños de este dato. Copia local alimentada por
 * {@code CursoArchivadoEvent} desde Cursos (Tema 02) vía Kafka. Nunca se escribe desde acá
 * salvo al consumir ese evento. Ver path/06-contrato-api.md §5.
 */
@Getter
@Setter
@Entity
@Table(name = "curso_cohorte_contexto")
public class CursoCohorteContextoEntity extends EntidadBase {

    @Column(name = "curso_cohorte_id", nullable = false, unique = true)
    private UUID cursoCohorteId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoCursoCohorte estado;

    /** Usado por RF-RNK-09: percentiles P90/P10 solo con ≥ 10 inscriptos. */
    @Column(name = "inscriptos_activos", nullable = false)
    private Integer inscriptosActivos = 0;
}
