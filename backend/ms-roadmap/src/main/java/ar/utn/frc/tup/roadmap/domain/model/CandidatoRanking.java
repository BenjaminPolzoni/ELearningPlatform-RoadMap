package ar.utn.frc.tup.roadmap.domain.model;

/**
 * Los datos de un alumno que las {@code Specification} de ranking necesitan evaluar.
 * No es una entidad — es una foto de solo-lectura armada por quien calcula el ranking.
 */
public record CandidatoRanking(
    Zona zona,
    int vidasPerdidasHistorico,
    int porcentajeObligatoriosAprobados
) {
}
