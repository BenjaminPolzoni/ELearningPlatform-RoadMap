package ar.utn.frc.tup.roadmap.domain.service;

import ar.utn.frc.tup.roadmap.domain.model.ContextoMovimientoXp;
import ar.utn.frc.tup.roadmap.domain.model.TipoMovimientoXp;

/**
 * Strategy: una implementación por {@link TipoMovimientoXp}. Agregar un tipo de
 * movimiento nuevo es agregar una clase — {@link MotorXp} no se toca (Open/Closed).
 */
public interface CalculadoraXp {

    TipoMovimientoXp tipoQueManeja();

    int calcular(ContextoMovimientoXp contexto);
}
