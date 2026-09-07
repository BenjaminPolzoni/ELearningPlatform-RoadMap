package ar.utn.frc.tup.roadmap.infrastructure.persistence.entity;

import ar.utn.frc.tup.roadmap.domain.model.TipoMovimientoVida;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * ⚠️ Alcance a confirmar con la cátedra — ver path/README.md §1.2 "Discrepancias".
 * No figura en el resumen oficial del Tema 10, pero la arquitectura la asigna acá
 * y el Tema 03 lo dice explícitamente ("las vidas quedan asignadas al Tema 10").
 *
 * <p>{@code vidas_vigentes} (sube y baja, techo PAR-12) y {@code vidas_perdidas_historico}
 * (nunca decrece, es el que usa RF-RNK-05) se derivan sumando estos movimientos — no se
 * persisten como campo propio.
 */
@Getter
@Setter
@Entity
@Table(name = "movimiento_vida")
public class MovimientoVidaEntity extends MovimientoBase {

    @Column(name = "alumno_id", nullable = false)
    private UUID alumnoId;

    @Column(name = "curso_cohorte_id", nullable = false)
    private UUID cursoCohorteId;

    @Column(name = "nodo_id")
    private UUID nodoId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoMovimientoVida tipo;

    /**
     * Solo trazabilidad ("qué evento causó esta pérdida de vida") — la idempotencia real
     * la resuelve {@code EventoProcesadoEntity} antes de llegar acá, por eso sin
     * unique constraint (a diferencia de {@code MovimientoXpEntity.origenEventoId}).
     */
    @Column(name = "origen_evento_id")
    private UUID origenEventoId;
}
