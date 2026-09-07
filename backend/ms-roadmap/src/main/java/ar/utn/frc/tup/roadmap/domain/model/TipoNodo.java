package ar.utn.frc.tup.roadmap.domain.model;

/**
 * ⚠️ EXTENSIÓN PROPUESTA sobre el modelo original del G10 (que solo definía DESAFIO | HITO).
 * Ver path/02-modelo-de-datos.md §4 — pendiente de validar con el equipo y con el
 * Motor de Desafíos (Tema 03), porque afecta qué esperan recibir en {@code desafioId}.
 */
public enum TipoNodo {
    TEORIA,
    PRACTICA,
    DESAFIO_TEORICO,
    DESAFIO_PRACTICO,
    RECUPERACION,
    HITO,
    BOSS
}
