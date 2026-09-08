package ar.utn.frc.tup.roadmap.domain.model;

/**
 * ⚠️ EXTENSIÓN PROPUESTA sobre el modelo original del G10 (que solo definía DESAFIO | HITO).
 * Ver path/02-modelo-de-datos.md §4 — pendiente de validar con el equipo y con el
 * Motor de Desafíos (Tema 03), porque afecta qué esperan recibir en {@code desafioId}.
 *
 * <p><b>Corrección:</b> {@code RECUPERACION} vivió acá como un valor más de este enum
 * hasta implementar el Camino 3 en serio. RF-REC-06 describe un <i>pool por curso</i>
 * ("pool de desafíos de recuperación por curso, cargado por el profesor"), no un nodo
 * posicionado en una sección del mapa — modelarlo como {@code TipoNodo} hubiera forzado
 * cada desafío de recuperación a tener un {@code seccionId} y una posición (x,y) que no
 * significan nada para algo que nunca se dibuja en el grafo. Ahora vive en
 * {@link ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.DesafioRecuperacionEntity},
 * una tabla propia a nivel curso.
 */
public enum TipoNodo {
    TEORIA,
    PRACTICA,
    DESAFIO_TEORICO,
    DESAFIO_PRACTICO,
    HITO,
    BOSS
}
