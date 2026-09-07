package ar.utn.frc.tup.roadmap.domain.service;

import ar.utn.frc.tup.roadmap.domain.model.ContextoMovimientoXp;
import ar.utn.frc.tup.roadmap.domain.model.TipoMovimientoXp;
import ar.utn.frc.tup.roadmap.domain.port.LectorParametrosPort;

public class CalculadoraXpDesafioPersonalizado implements CalculadoraXp {

    private final LectorParametrosPort parametros;

    public CalculadoraXpDesafioPersonalizado(LectorParametrosPort parametros) {
        this.parametros = parametros;
    }

    @Override
    public TipoMovimientoXp tipoQueManeja() {
        return TipoMovimientoXp.DESAFIO_PERSONALIZADO;
    }

    @Override
    public int calcular(ContextoMovimientoXp contexto) {
        return parametros.xpDesafioPersonalizado();
    }
}
