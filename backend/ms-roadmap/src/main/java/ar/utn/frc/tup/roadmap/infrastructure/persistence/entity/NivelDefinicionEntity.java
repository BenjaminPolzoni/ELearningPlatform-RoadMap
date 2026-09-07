package ar.utn.frc.tup.roadmap.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * Máximo 10 por curso (RF-NIV-04). El nivel del alumno se DERIVA de su XP contra esta
 * curva — nunca se persiste como estado propio del alumno (RF-NIV-05).
 */
@Getter
@Setter
@Entity
@Table(name = "nivel_definicion")
public class NivelDefinicionEntity extends EntidadBase {

    @Column(name = "curso_cohorte_id", nullable = false)
    private UUID cursoCohorteId;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(name = "umbral_xp", nullable = false)
    private Integer umbralXp;

    @Column(nullable = false)
    private Integer orden;
}
