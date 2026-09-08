package ar.utn.frc.tup.roadmap.domain.model;

import java.util.UUID;

/**
 * Una fila del ranking ya resuelta: posición, percentil, zona y los flags de cierre.
 * Datos propios únicamente — nombre/avatar/monedas los agrega el BFF (06-contrato-api.md §6.2).
 *
 * @param percentil {@code null} cuando el curso tiene menos de 10 inscriptos activos
 *        (RF-RNK-09: sin percentiles). Si no, 0..100 con un decimal.
 */
public record PosicionRanking(
    UUID alumnoId,
    int xpTotal,
    int posicion,
    Double percentil,
    Zona zona,
    long insigniasCount,
    int vidasPerdidasHistorico,
    int ejerciciosCompletados,
    boolean candidatoPromocion,
    boolean riesgoRegularidad
) {}
