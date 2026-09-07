package ar.utn.frc.tup.roadmap.domain.model;

/**
 * El XP es historial de movimientos, nunca un contador (RF-CFG-06, RF-IA-18).
 * Ver path/02-modelo-de-datos.md §6.
 */
public enum TipoMovimientoXp {
    OTORGADO_DESAFIO,
    AJUSTE_USO_IA,
    AJUSTE_APELACION,
    DESAFIO_PERSONALIZADO
}
