package ar.utn.frc.tup.roadmap.domain.model;

import java.util.UUID;

/**
 * Foto de solo-lectura de un alumno para calcular el ranking. La arma quien lee las
 * tablas base (XP, vidas, progreso, insignias) — el {@code CalculadoraRanking} no toca
 * persistencia, solo ordena y clasifica esta lista.
 *
 * @param porcentajeObligatoriosAprobados 0..100. Un curso sin nodos obligatorios cuenta
 *        como 100 (no hay nada que reprobar).
 */
public record InsumoAlumnoRanking(
    UUID alumnoId,
    int xpTotal,
    long insigniasCount,
    int vidasPerdidasHistorico,
    int ejerciciosCompletados,
    int porcentajeObligatoriosAprobados
) {}
