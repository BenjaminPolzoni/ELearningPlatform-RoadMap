package ar.utn.frc.tup.roadmap.domain.service;

import ar.utn.frc.tup.roadmap.domain.model.AjusteManual;
import ar.utn.frc.tup.roadmap.domain.model.ContextoMovimientoXp;
import ar.utn.frc.tup.roadmap.domain.model.TipoMovimientoXp;

/**
 * RF-IA-18: una apelación de score de IA puede reducir XP ya otorgado. El delta ya viene
 * calculado por Evaluación LLM — acá solo se registra, nunca se recalcula ni se toca
 * el movimiento original (RF-CFG-06).
 */
public class CalculadoraXpAjusteApelacion implements CalculadoraXp {

    @Override
    public TipoMovimientoXp tipoQueManeja() {
        return TipoMovimientoXp.AJUSTE_APELACION;
    }

    @Override
    public int calcular(ContextoMovimientoXp contexto) {
        if (!(contexto instanceof AjusteManual ctx)) {
            throw new IllegalArgumentException(
                "CalculadoraXpAjusteApelacion requiere AjusteManual, llegó " + contexto);
        }
        return ctx.delta();
    }
}
