package ar.utn.frc.tup.roadmap.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * RF-REC-06: pool de desafíos de recuperación de vida, cargado por el PROFESOR — a nivel
 * CURSO, no un nodo del mapa (por eso no es un {@code RoadmapNodoEntity}, ver la nota de
 * corrección en {@code TipoNodo.java}). Referencia el contenido externo por
 * {@code desafioId}, igual que hace {@code RoadmapNodoEntity} — Roadmap no conoce ni
 * edita ese contenido.
 *
 * <p>⚠️ Decisión de diseño nuestra, no confirmada: el PRD deja abierto "si el pool y la
 * selección los administra Roadmap o Motor de Desafíos" (RF-REC-06). Acá se asume que sí,
 * por coherencia con cómo ya tratamos {@code RoadmapNodo.desafioId} — a validar con el
 * equipo. Ver path/deuda-tecnica/.
 */
@Getter
@Setter
@Entity
@Table(name = "desafio_recuperacion")
public class DesafioRecuperacionEntity extends EntidadBase {

    @Column(name = "curso_cohorte_id", nullable = false)
    private UUID cursoCohorteId;

    @Column(name = "desafio_id", nullable = false)
    private UUID desafioId;
}
