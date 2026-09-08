package ar.utn.frc.tup.roadmap.infrastructure.config;

import ar.utn.frc.tup.roadmap.domain.port.LectorParametrosPort;
import ar.utn.frc.tup.roadmap.domain.service.CalculadoraXp;
import ar.utn.frc.tup.roadmap.domain.service.CalculadoraXpAjusteApelacion;
import ar.utn.frc.tup.roadmap.domain.service.CalculadoraXpAjusteUsoIa;
import ar.utn.frc.tup.roadmap.domain.service.CalculadoraXpDesafioPersonalizado;
import ar.utn.frc.tup.roadmap.domain.service.CalculadoraXpOtorgadoDesafio;
import ar.utn.frc.tup.roadmap.domain.service.MotorDesbloqueo;
import ar.utn.frc.tup.roadmap.domain.service.MotorVidas;
import ar.utn.frc.tup.roadmap.domain.service.MotorXp;
import ar.utn.frc.tup.roadmap.domain.service.SelectorRecuperacion;
import java.util.List;
import java.util.Random;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * El ÚNICO lugar del proyecto donde el mundo de Spring toca los motores de dominio.
 * Las clases {@code domain.*} no llevan {@code @Component} ni ninguna anotación de
 * framework — a propósito, para poder instanciarlas con {@code new} en un test JUnit
 * puro (ver {@code MotorXpTest}, que arma su propio {@code MotorXp} sin este config).
 * Acá es donde se ensamblan para que la aplicación real las use vía inyección.
 */
@Configuration
public class MotoresConfig {

    @Bean
    public MotorXp motorXp(LectorParametrosPort lectorParametros) {
        List<CalculadoraXp> estrategias = List.of(
            new CalculadoraXpOtorgadoDesafio(lectorParametros),
            new CalculadoraXpAjusteApelacion(),
            new CalculadoraXpAjusteUsoIa(),
            new CalculadoraXpDesafioPersonalizado(lectorParametros)
        );
        return new MotorXp(estrategias);
    }

    @Bean
    public MotorVidas motorVidas() {
        return new MotorVidas();
    }

    @Bean
    public MotorDesbloqueo motorDesbloqueo() {
        return new MotorDesbloqueo();
    }

    @Bean
    public SelectorRecuperacion selectorRecuperacion() {
        return new SelectorRecuperacion(new Random());
    }
}
