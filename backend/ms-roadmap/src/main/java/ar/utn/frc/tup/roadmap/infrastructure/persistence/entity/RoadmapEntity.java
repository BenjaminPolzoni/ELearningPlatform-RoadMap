package ar.utn.frc.tup.roadmap.infrastructure.persistence.entity;

import ar.utn.frc.tup.roadmap.domain.model.EstadoRoadmap;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * Raíz del grafo de un curso. Todo lo demás (secciones, nodos, conexiones) cuelga de acá,
 * y es lo único que carga directamente {@code curso_cohorte_id} — el resto lo hereda
 * transitivamente (RoadmapSeccion → roadmap_id → Roadmap → curso_cohorte_id).
 * Ver path/02-modelo-de-datos.md §3.
 */
@Getter
@Setter
@Entity
@Table(name = "roadmap")
public class RoadmapEntity extends EntidadBase {

    @Column(name = "curso_cohorte_id", nullable = false, unique = true)
    private UUID cursoCohorteId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoRoadmap estado = EstadoRoadmap.BORRADOR;
}
