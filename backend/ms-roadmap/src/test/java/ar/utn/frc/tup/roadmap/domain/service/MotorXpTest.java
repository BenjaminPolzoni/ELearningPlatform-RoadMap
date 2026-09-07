package ar.utn.frc.tup.roadmap.domain.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ar.utn.frc.tup.roadmap.domain.model.AjusteManual;
import ar.utn.frc.tup.roadmap.domain.model.Dificultad;
import ar.utn.frc.tup.roadmap.domain.model.DesafioPersonalizado;
import ar.utn.frc.tup.roadmap.domain.model.OtorgamientoPorDesafio;
import ar.utn.frc.tup.roadmap.domain.model.TipoMovimientoXp;
import ar.utn.frc.tup.roadmap.domain.port.LectorParametrosPort;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Sin Spring, sin Mockito — un fake a mano de {@link LectorParametrosPort} alcanza.
 * Esto es lo que compra el patrón Ports & Adapters: el motor no sabe ni le importa que
 * en producción esos números salen de una llamada HTTP al Gateway.
 */
class MotorXpTest {

    /** PAR-01 de referencia (path/README.md §3.6) — no los valores reales de Backoffice. */
    private static class ParametrosDeReferencia implements LectorParametrosPort {
        @Override
        public int xpBasePorDificultad(Dificultad dificultad) {
            return switch (dificultad) {
                case BASICO -> 100;
                case MEDIO -> 250;
                case AVANZADO -> 500;
            };
        }

        @Override
        public int xpDesafioPersonalizado() {
            return 30;
        }
    }

    private final MotorXp motor = new MotorXp(List.of(
        new CalculadoraXpOtorgadoDesafio(new ParametrosDeReferencia()),
        new CalculadoraXpAjusteApelacion(),
        new CalculadoraXpAjusteUsoIa(),
        new CalculadoraXpDesafioPersonalizado(new ParametrosDeReferencia())
    ));

    @Test
    void otorgadoDesafio_usaElXpBaseSegunDificultad() {
        int monto = motor.calcularMonto(
            TipoMovimientoXp.OTORGADO_DESAFIO,
            new OtorgamientoPorDesafio(Dificultad.AVANZADO)
        );
        assertThat(monto).isEqualTo(500);
    }

    @Test
    void ajusteApelacion_puedeSerNegativo_reduceXpYaOtorgado() {
        int monto = motor.calcularMonto(TipoMovimientoXp.AJUSTE_APELACION, new AjusteManual(-150));
        assertThat(monto).isEqualTo(-150);
    }

    @Test
    void desafioPersonalizado_usaElValorMenorSinMonedas() {
        int monto = motor.calcularMonto(TipoMovimientoXp.DESAFIO_PERSONALIZADO, new DesafioPersonalizado());
        assertThat(monto).isEqualTo(30);
    }

    @Test
    void sinEstrategiaRegistradaParaUnTipo_explotaEnVezDeDevolverCualquierCosa() {
        MotorXp motorIncompleto = new MotorXp(List.of(new CalculadoraXpAjusteApelacion()));

        assertThatThrownBy(() -> motorIncompleto.calcularMonto(
            TipoMovimientoXp.OTORGADO_DESAFIO,
            new OtorgamientoPorDesafio(Dificultad.BASICO)
        )).isInstanceOf(IllegalStateException.class);
    }
}
