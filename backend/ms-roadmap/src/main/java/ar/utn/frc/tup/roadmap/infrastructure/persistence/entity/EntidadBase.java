package ar.utn.frc.tup.roadmap.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * Base para toda entidad propia que representa un ESTADO ACTUAL (no un historial).
 * Aplica RF-NFR-01: borrado lógico sin excepción — nada se borra físicamente, se marca
 * {@code activo = false} con su {@code bajaEn}.
 *
 * <p>Los ledgers append-only (movimientos de XP, de vidas, insignias) NO extienden esta
 * clase — ver {@link MovimientoBase} y su javadoc para el porqué.
 */
@Getter
@Setter
@MappedSuperclass
public abstract class EntidadBase {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private Instant creadoEn;

    @Column(name = "actualizado_en", nullable = false)
    private Instant actualizadoEn;

    @Column(nullable = false)
    private boolean activo = true;

    @Column(name = "baja_en")
    private Instant bajaEn;

    @PrePersist
    void prePersist() {
        Instant ahora = Instant.now();
        this.creadoEn = ahora;
        this.actualizadoEn = ahora;
    }

    @PreUpdate
    void preUpdate() {
        this.actualizadoEn = Instant.now();
    }

    /** Baja lógica (RF-NFR-01). Nunca hay un DELETE físico sobre entidades propias. */
    public void darDeBaja() {
        this.activo = false;
        this.bajaEn = Instant.now();
    }
}
