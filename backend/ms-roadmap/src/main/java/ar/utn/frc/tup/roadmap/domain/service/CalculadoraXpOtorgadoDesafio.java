package ar.utn.frc.tup.roadmap.domain.service;

import ar.utn.frc.tup.roadmap.domain.model.ContextoMovimientoXp;
import ar.utn.frc.tup.roadmap.domain.model.OtorgamientoPorDesafio;
import ar.utn.frc.tup.roadmap.domain.model.TipoMovimientoXp;
import ar.utn.frc.tup.roadmap.domain.port.LectorParametrosPort;

public class CalculadoraXpOtorgadoDesafio implements CalculadoraXp {

    private final LectorParametrosPort parametros;

    public CalculadoraXpOtorgadoDesafio(LectorParametrosPort parametros) {
        this.parametros = parametros;
    }

    @Override
    public TipoMovimientoXp tipoQueManeja() {
        return TipoMovimientoXp.OTORGADO_DESAFIO;
    }

    @Override
    public int calcular(ContextoMovimientoXp contexto) {
        if (!(contexto instanceof OtorgamientoPorDesafio ctx)) {
            throw new IllegalArgumentException(
                "CalculadoraXpOtorgadoDesafio requiere OtorgamientoPorDesafio, llegó " + contexto);
        }
        // TODO Fase 2: sumar el ajuste por calidad/tiempo (PAR-04) y por uso de IA (PAR-05).
        // Hoy solo aplica el XP base por dificultad — es la parte del cálculo ya cerrada.
        return parametros.xpBasePorDificultad(ctx.dificultad());
    }
}
