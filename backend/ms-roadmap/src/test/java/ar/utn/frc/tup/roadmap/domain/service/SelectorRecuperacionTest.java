package ar.utn.frc.tup.roadmap.domain.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Random;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SelectorRecuperacionTest {

    @Test
    void elige_elUnicoNoResuelto_cuandoHayUnoSoloDisponible() {
        UUID resuelto = UUID.randomUUID();
        UUID sinResolver = UUID.randomUUID();
        SelectorRecuperacion selector = new SelectorRecuperacion(new Random(1));

        UUID elegido = selector.elegir(List.of(resuelto, sinResolver), List.of(resuelto));

        assertThat(elegido).isEqualTo(sinResolver);
    }

    @Test
    void recicla_eligiendoDeTodoElPool_siYaResolvioTodos() {
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        SelectorRecuperacion selector = new SelectorRecuperacion(new Random(1));

        UUID elegido = selector.elegir(List.of(a, b), List.of(a, b));

        assertThat(elegido).isIn(a, b);
    }

    @Test
    void explota_siElPoolEstaVacio() {
        SelectorRecuperacion selector = new SelectorRecuperacion(new Random(1));

        assertThatThrownBy(() -> selector.elegir(List.of(), List.of()))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void eligeSoloDeUnCandidato_cuandoElPoolTieneUnSoloElemento() {
        UUID unico = UUID.randomUUID();
        SelectorRecuperacion selector = new SelectorRecuperacion(new Random(42));

        UUID elegido = selector.elegir(List.of(unico), List.of());

        assertThat(elegido).isEqualTo(unico);
    }
}
