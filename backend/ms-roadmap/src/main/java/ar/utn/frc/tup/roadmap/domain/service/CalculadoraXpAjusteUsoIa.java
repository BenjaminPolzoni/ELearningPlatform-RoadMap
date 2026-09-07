package ar.utn.frc.tup.roadmap.domain.service;

import ar.utn.frc.tup.roadmap.domain.model.AjusteManual;
import ar.utn.frc.tup.roadmap.domain.model.ContextoMovimientoXp;
import ar.utn.frc.tup.roadmap.domain.model.TipoMovimientoXp;

/** PAR-05: bonus o penalidad por score de uso de IA. El delta llega ya calculado. */
public class CalculadoraXpAjusteUsoIa implements CalculadoraXp {

    @Override
    public TipoMovimientoXp tipoQueManeja() {
        return TipoMovimientoXp.AJUSTE_USO_IA;
    }

    @Override
    public int calcular(ContextoMovimientoXp contexto) {
        if (!(contexto instanceof AjusteManual ctx)) {
            throw new IllegalArgumentException(
                "CalculadoraXpAjusteUsoIa requiere AjusteManual, llegó " + contexto);
        }
        return ctx.delta();
    }
}
