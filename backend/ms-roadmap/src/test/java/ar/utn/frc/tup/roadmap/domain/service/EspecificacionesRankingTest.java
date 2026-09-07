package ar.utn.frc.tup.roadmap.domain.service;

import static org.assertj.core.api.Assertions.assertThat;

import ar.utn.frc.tup.roadmap.domain.model.CandidatoRanking;
import ar.utn.frc.tup.roadmap.domain.model.Zona;
import org.junit.jupiter.api.Test;

/** RF-RNK-05/06: cada condición se prueba sola, después la regla compuesta. */
class EspecificacionesRankingTest {

    @Test
    void esCandidatoPromocion_soloSiCumpleLasTresCondicionesALaVez() {
        var cumpleTodo = new CandidatoRanking(Zona.P90, 0, 100);
        assertThat(EspecificacionesRanking.ES_CANDIDATO_PROMOCION.cumple(cumpleTodo)).isTrue();
    }

    @Test
    void esCandidatoPromocion_falso_siPerdioAlgunaVidaAlgunaVezAunqueEsteEnP90() {
        // "estrictamente 0", independientemente de si compró o regeneró vidas después (RF-RNK-05).
        var perdioUnaVidaAlgunaVez = new CandidatoRanking(Zona.P90, 1, 100);
        assertThat(EspecificacionesRanking.ES_CANDIDATO_PROMOCION.cumple(perdioUnaVidaAlgunaVez)).isFalse();
    }

    @Test
    void esCandidatoPromocion_falso_siNoEstaEnZonaP90AunqueElRestoCumpla() {
        var fueraDeP90 = new CandidatoRanking(Zona.NINGUNA, 0, 100);
        assertThat(EspecificacionesRanking.ES_CANDIDATO_PROMOCION.cumple(fueraDeP90)).isFalse();
    }

    @Test
    void esCandidatoPromocion_falso_siNoAproboTodosLosObligatorios() {
        var faltanObligatorios = new CandidatoRanking(Zona.P90, 0, 80);
        assertThat(EspecificacionesRanking.ES_CANDIDATO_PROMOCION.cumple(faltanObligatorios)).isFalse();
    }

    @Test
    void esRiesgoRegularidad_siEstaEnP10YNoAproboTodo() {
        var enRiesgo = new CandidatoRanking(Zona.P10, 3, 60);
        assertThat(EspecificacionesRanking.ES_RIESGO_REGULARIDAD.cumple(enRiesgo)).isTrue();
    }

    @Test
    void esRiesgoRegularidad_falso_siEstaEnP10PeroAproboTodo() {
        var p10PeroAlDia = new CandidatoRanking(Zona.P10, 0, 100);
        assertThat(EspecificacionesRanking.ES_RIESGO_REGULARIDAD.cumple(p10PeroAlDia)).isFalse();
    }
}
