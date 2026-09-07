package ar.utn.frc.tup.roadmap.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * Base para los ledgers append-only: {@code MovimientoXp}, {@code MovimientoVida},
 * {@code InsigniaOtorgada}. Ver path/02-modelo-de-datos.md §6 — "por qué el XP no puede
 * ser un contador".
 *
 * <p><b>Deliberadamente NO extiende {@link EntidadBase}</b>: no lleva {@code activo} ni
 * {@code bajaEn}. Un movimiento histórico no se "da de baja" — el modelo prohíbe editar
 * o borrar un movimiento ya registrado; una corrección se hace agregando un movimiento
 * nuevo (ej. {@code ajuste_apelacion}), nunca tocando el original. No existe ningún
 * endpoint DELETE sobre movimientos en el contrato (ver path/06-contrato-api.md).
 * Si esta decisión cambia, es una discusión de equipo, no un ajuste de código suelto.
 */
@Getter
@Setter
@MappedSuperclass
public abstract class MovimientoBase {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "registrado_en", nullable = false, updatable = false)
    private Instant registradoEn;

    @PrePersist
    void prePersist() {
        this.registradoEn = Instant.now();
    }
}
