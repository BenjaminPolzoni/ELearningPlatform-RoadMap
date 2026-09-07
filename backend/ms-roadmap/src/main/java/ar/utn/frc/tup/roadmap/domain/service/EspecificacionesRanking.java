package ar.utn.frc.tup.roadmap.domain.service;

import ar.utn.frc.tup.roadmap.domain.model.CandidatoRanking;
import ar.utn.frc.tup.roadmap.domain.model.Zona;

/**
 * Las reglas compuestas de RF-RNK-05/06, nombradas y combinables — compará esto contra
 * un {@code if (zona == P90 && vidas == 0 && pct == 100)} disperso en un service: acá cada
 * pieza se lee, se testea y se reutiliza sola.
 */
public final class EspecificacionesRanking {

    public static final Specification<CandidatoRanking> EN_ZONA_P90 =
        c -> c.zona() == Zona.P90;

    public static final Specification<CandidatoRanking> EN_ZONA_P10 =
        c -> c.zona() == Zona.P10;

    public static final Specification<CandidatoRanking> SIN_VIDAS_PERDIDAS =
        c -> c.vidasPerdidasHistorico() == 0;

    public static final Specification<CandidatoRanking> TODOS_LOS_OBLIGATORIOS_APROBADOS =
        c -> c.porcentajeObligatoriosAprobados() == 100;

    /** RF-RNK-05: ninguna condición alcanza por sí sola. */
    public static final Specification<CandidatoRanking> ES_CANDIDATO_PROMOCION =
        EN_ZONA_P90.y(SIN_VIDAS_PERDIDAS).y(TODOS_LOS_OBLIGATORIOS_APROBADOS);

    /** RF-RNK-06. */
    public static final Specification<CandidatoRanking> ES_RIESGO_REGULARIDAD =
        EN_ZONA_P10.y(TODOS_LOS_OBLIGATORIOS_APROBADOS.negar());

    private EspecificacionesRanking() {
    }
}
