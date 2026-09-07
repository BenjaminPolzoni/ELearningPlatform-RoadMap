package ar.utn.frc.tup.roadmap.domain.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class MotorDesbloqueoTest {

    private final MotorDesbloqueo motor = new MotorDesbloqueo();

    @Test
    void desbloquea_cuandoElXpAcumuladoIgualaElUmbral() {
        assertThat(motor.debeDesbloquear(500, 500)).isTrue();
    }

    @Test
    void desbloquea_cuandoElXpAcumuladoSuperaElUmbral() {
        assertThat(motor.debeDesbloquear(600, 500)).isTrue();
    }

    @Test
    void noDesbloquea_cuandoFaltaXpParaElUmbral() {
        assertThat(motor.debeDesbloquear(499, 500)).isFalse();
    }
}
