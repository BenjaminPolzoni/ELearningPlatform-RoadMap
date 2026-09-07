package ar.utn.frc.tup.roadmap.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/** Prerequisito entre dos nodos — el "camino" que se dibuja en el mapa. */
@Getter
@Setter
@Entity
@Table(name = "roadmap_conexion")
public class RoadmapConexionEntity extends EntidadBase {

    @Column(name = "roadmap_id", nullable = false)
    private UUID roadmapId;

    @Column(name = "nodo_origen_id", nullable = false)
    private UUID nodoOrigenId;

    @Column(name = "nodo_destino_id", nullable = false)
    private UUID nodoDestinoId;
}
