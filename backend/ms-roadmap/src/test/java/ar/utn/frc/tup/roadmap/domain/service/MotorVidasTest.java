package ar.utn.frc.tup.roadmap.domain.service;

import static org.assertj.core.api.Assertions.assertThat;

import ar.utn.frc.tup.roadmap.domain.model.EstadoNodo;
import org.junit.jupiter.api.Test;

class MotorVidasTest {

    private final MotorVidas motor = new MotorVidas();

    @Test
    void descuentaVida_cuandoElNodoTerminaEnFallado() {
        assertThat(motor.correspondeDescontarVida(EstadoNodo.FALLADO, false)).isTrue();
    }

    @Test
    void noDescuentaVida_cuandoElNodoSigueHabilitado_quedabanReintentosGratis() {
        assertThat(motor.correspondeDescontarVida(EstadoNodo.HABILITADO, false)).isFalse();
    }

    @Test
    void noDescuentaVida_cuandoElNodoSeCompleta() {
        assertThat(motor.correspondeDescontarVida(EstadoNodo.COMPLETADO, false)).isFalse();
    }

    @Test
    void nuncaDescuentaVida_siEsDesafioPersonalizado_aunqueTermineEnFallado() {
        // RF-DES-05: los desafíos personalizados por LLM nunca consumen vidas.
        assertThat(motor.correspondeDescontarVida(EstadoNodo.FALLADO, true)).isFalse();
    }
}
