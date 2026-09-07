package ar.utn.frc.tup.roadmap.domain.service;

import ar.utn.frc.tup.roadmap.domain.model.ContextoMovimientoXp;
import ar.utn.frc.tup.roadmap.domain.model.TipoMovimientoXp;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Resuelve la {@link CalculadoraXp} correcta según el tipo de movimiento (Strategy).
 * No sabe de JPA ni de Spring: recibe las estrategias ya construidas por quien lo arme
 * (ver {@code infrastructure.config.MotoresConfig} para el cableado con Spring) — así se
 * puede testear con JUnit puro, pasándole implementaciones de prueba a mano.
 */
public class MotorXp {

    private final Map<TipoMovimientoXp, CalculadoraXp> calculadoras;

    public MotorXp(Iterable<CalculadoraXp> estrategias) {
        this.calculadoras = stream(estrategias)
            .collect(Collectors.toUnmodifiableMap(CalculadoraXp::tipoQueManeja, Function.identity()));
    }

    /** RF-CFG-06: el monto se calcula al momento — nunca se recalcula un movimiento pasado. */
    public int calcularMonto(TipoMovimientoXp tipo, ContextoMovimientoXp contexto) {
        CalculadoraXp calculadora = calculadoras.get(tipo);
        if (calculadora == null) {
            throw new IllegalStateException(
                "No hay CalculadoraXp registrada para " + tipo + " — falta una implementación de CalculadoraXp");
        }
        return calculadora.calcular(contexto);
    }

    private static <T> java.util.stream.Stream<T> stream(Iterable<T> iterable) {
        return java.util.stream.StreamSupport.stream(iterable.spliterator(), false);
    }
}
