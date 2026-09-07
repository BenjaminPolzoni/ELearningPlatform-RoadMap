package ar.utn.frc.tup.roadmap.infrastructure.persistence.entity;

import ar.utn.frc.tup.roadmap.domain.model.TipoNodo;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * La "actividad" dentro de una unidad. Referencia el contenido real por {@code desafioId}
 * — Roadmap solo ubica y conecta, nunca conoce ni edita ese contenido (RF-CUR-04).
 * Ver path/02-modelo-de-datos.md §2.
 */
@Getter
@Setter
@Entity
@Table(name = "roadmap_nodo")
public class RoadmapNodoEntity extends EntidadBase {

    @Column(name = "seccion_id", nullable = false)
    private UUID seccionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoNodo tipo;

    /** Nulo para TipoNodo.HITO. Puntero externo — el Motor de Desafíos es dueño del contenido. */
    @Column(name = "desafio_id")
    private UUID desafioId;

    @Column(name = "posicion_x", nullable = false)
    private Double posicionX;

    @Column(name = "posicion_y", nullable = false)
    private Double posicionY;

    @Column(name = "es_obligatorio", nullable = false)
    private boolean esObligatorio = true;

    /** 0 a 3, default PAR-13. Ver RF-DES-07. */
    @Column(name = "reintentos_permitidos", nullable = false)
    private Integer reintentosPermitidos = 0;
}
