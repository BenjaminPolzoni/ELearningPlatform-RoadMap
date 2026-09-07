package ar.utn.frc.tup.roadmap.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * Patrón Inbox — marca de deduplicación para eventos consumidos del bus (DoD: "idempotencia
 * al consumir eventos, dedupe por origen_evento_id").
 *
 * <p>Por qué una tabla aparte y no confiar solo en {@code MovimientoXpEntity.origenEventoId}:
 * el camino de FALLO de {@code DesafioCompletadoEvent} no siempre genera un MovimientoXp
 * (puede no generar nada, o generar solo un MovimientoVida) — si el bus reintrega el mismo
 * evento de fallo, chequear únicamente contra movimientos de XP dejaría pasar el duplicado
 * y contaría el fallo dos veces. Esta tabla es el gate ÚNICO, antes de decidir nada,
 * independiente de qué termine escribiendo el use case.
 *
 * <p>La clave primaria ES el {@code origenEventoId} del evento — no un UUID generado
 * aparte. Eso es lo que hace atómico el "insertar y a la vez marcar como visto".
 */
@Getter
@Setter
@Entity
@Table(name = "evento_procesado")
public class EventoProcesadoEntity {

    @Id
    private UUID origenEventoId;

    @Column(name = "procesado_en", nullable = false)
    private Instant procesadoEn = Instant.now();
}
