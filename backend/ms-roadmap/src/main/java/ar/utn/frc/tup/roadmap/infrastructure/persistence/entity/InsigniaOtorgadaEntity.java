package ar.utn.frc.tup.roadmap.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * Insignia GANADA por el alumno (no confundir con la insignia "destacada" que elige
 * exhibir — eso es personalización cosmética de Mercado, Tema 09). Cuenta para el primer
 * criterio de desempate del ranking (RF-RNK-11). Ver path/README.md §3.5.
 *
 * <p>⚠️ Origen del evento de otorgamiento sin confirmar — ver dudas abiertas.
 */
@Getter
@Setter
@Entity
@Table(name = "insignia_otorgada")
public class InsigniaOtorgadaEntity extends MovimientoBase {

    @Column(name = "alumno_id", nullable = false)
    private UUID alumnoId;

    @Column(name = "curso_cohorte_id", nullable = false)
    private UUID cursoCohorteId;

    @Column(name = "insignia_id", nullable = false)
    private UUID insigniaId;

    @Column(name = "origen_evento_id")
    private UUID origenEventoId;
}
