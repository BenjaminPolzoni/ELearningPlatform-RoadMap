package ar.utn.frc.tup.roadmap.domain.model;

/**
 * Contexto de {@code DESAFIO_PERSONALIZADO} — XP menor, sin monedas (PAR-02). Sin campos
 * propios hoy; existe como marcador para que el switch del motor sea exhaustivo y quede
 * un lugar claro si mañana necesita datos propios.
 */
public record DesafioPersonalizado() implements ContextoMovimientoXp {
}
