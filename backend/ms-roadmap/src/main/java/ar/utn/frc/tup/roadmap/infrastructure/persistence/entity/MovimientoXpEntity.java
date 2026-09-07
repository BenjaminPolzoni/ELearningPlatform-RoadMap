package ar.utn.frc.tup.roadmap.infrastructure.persistence.entity;

import ar.utn.frc.tup.roadmap.domain.model.TipoMovimientoXp;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * Un otorgamiento, ajuste o corrección de XP. NUNCA se actualiza un registro existente
 * (ver {@link MovimientoBase}). {@code xpTotal} = suma de movimientos vigentes de un alumno
 * en un curso — se calcula, no se guarda acá.
 *
 * <p>{@code origenEventoId} es único: es la clave de idempotencia al consumir
 * {@code DesafioCompletadoEvent} desde Kafka (ver path/06-contrato-api.md §5).
 */
@Getter
@Setter
@Entity
@Table(
    name = "movimiento_xp",
    uniqueConstraints = @UniqueConstraint(columnNames = {"origen_evento_id"})
)
public class MovimientoXpEntity extends MovimientoBase {

    @Column(name = "alumno_id", nullable = false)
    private UUID alumnoId;

    @Column(name = "curso_cohorte_id", nullable = false)
    private UUID cursoCohorteId;

    /** Nulo para movimientos que no nacen de un nodo puntual (ej. ajuste manual de ADMIN). */
    @Column(name = "nodo_id")
    private UUID nodoId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoMovimientoXp tipo;

    /** Puede ser negativo — ej. {@code ajuste_apelacion} que reduce XP ya otorgado (RF-IA-18). */
    @Column(nullable = false)
    private Integer monto;

    @Column(name = "rubric_version", length = 50)
    private String rubricVersion;

    /** Idempotencia: el mismo evento del bus no debe generar dos movimientos. Puede ser nulo
     *  para ajustes manuales de ADMIN que no nacen de un evento. */
    @Column(name = "origen_evento_id")
    private UUID origenEventoId;
}
