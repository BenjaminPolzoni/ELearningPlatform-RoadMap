package ar.utn.frc.tup.roadmap.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * La "unidad" del profesor. En el mapa 2.5D es una isla. Ver path/02-modelo-de-datos.md §2.
 */
@Getter
@Setter
@Entity
@Table(name = "roadmap_seccion")
public class RoadmapSeccionEntity extends EntidadBase {

    @Column(name = "roadmap_id", nullable = false)
    private UUID roadmapId;

    @Column(nullable = false, length = 200)
    private String nombre;

    /** Default de referencia PAR-08, pero el PROFESOR lo puede ajustar por sección (RF-CUR-06). */
    @Column(name = "umbral_xp_desbloqueo", nullable = false)
    private Integer umbralXpDesbloqueo;

    @Column(nullable = false)
    private Integer orden;
}
