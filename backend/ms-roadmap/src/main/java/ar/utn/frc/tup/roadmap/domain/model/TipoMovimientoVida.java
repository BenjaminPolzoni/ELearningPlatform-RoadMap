package ar.utn.frc.tup.roadmap.domain.model;

/**
 * Igual que el XP: historial, nunca un contador que solo suma.
 * {@code vidas_vigentes} sube y baja (con techo, PAR-12); {@code vidas_perdidas_historico}
 * nunca decrece. Ver path/02-modelo-de-datos.md §5-6.
 */
public enum TipoMovimientoVida {
    INICIAL,
    PERDIDA,
    RECUPERADA,
    COMPRADA
}
