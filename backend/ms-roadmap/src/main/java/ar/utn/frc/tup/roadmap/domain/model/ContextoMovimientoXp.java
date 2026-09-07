package ar.utn.frc.tup.roadmap.domain.model;

/**
 * Los datos que necesita CADA {@link TipoMovimientoXp} para calcular su monto son
 * distintos — esto lo modela como una jerarquía cerrada (sealed) en vez de un DTO
 * genérico con campos opcionales que no siempre aplican. El compilador exige que todo
 * {@code switch} sobre esto sea exhaustivo: si mañana aparece un tipo nuevo, el código
 * que no lo contempla no compila.
 */
public sealed interface ContextoMovimientoXp
    permits OtorgamientoPorDesafio, AjusteManual, DesafioPersonalizado {
}
