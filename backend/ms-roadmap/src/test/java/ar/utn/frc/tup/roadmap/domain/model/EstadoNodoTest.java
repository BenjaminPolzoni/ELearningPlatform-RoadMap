package ar.utn.frc.tup.roadmap.domain.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ar.utn.frc.tup.roadmap.domain.exception.TransicionInvalidaException;
import org.junit.jupiter.api.Test;

/**
 * Sin @SpringBootTest, sin mocks — es un enum. Prueba EXHAUSTIVA de la máquina de
 * estados documentada en path/02-modelo-de-datos.md §5.
 */
class EstadoNodoTest {

    @Test
    void bloqueado_pasaAHabilitado_alHabilitar() {
        assertThat(EstadoNodo.BLOQUEADO.alHabilitar()).isEqualTo(EstadoNodo.HABILITADO);
    }

    @Test
    void habilitado_pasaACompletado_alCompletarConExito() {
        assertThat(EstadoNodo.HABILITADO.alCompletar()).isEqualTo(EstadoNodo.COMPLETADO);
    }

    @Test
    void habilitado_siQuedanReintentos_sigueHabilitado() {
        assertThat(EstadoNodo.HABILITADO.alFallar(true)).isEqualTo(EstadoNodo.HABILITADO);
    }

    @Test
    void habilitado_siSeAgotanReintentos_pasaAFallado() {
        assertThat(EstadoNodo.HABILITADO.alFallar(false)).isEqualTo(EstadoNodo.FALLADO);
    }

    @Test
    void fallado_puedeSeguirIntentandoYCompletar_noQuedaBloqueadoParaSiempre() {
        // Duda cerrada con la cátedra: el nodo nunca queda bloqueado por sí mismo.
        assertThat(EstadoNodo.FALLADO.alCompletar()).isEqualTo(EstadoNodo.COMPLETADO);
    }

    @Test
    void fallado_siVuelveAFallar_sigueEnFallado_sinVolverAHabilitadoPrimero() {
        // Ya no hay "reintentos gratis" que consultar en este punto — cada fallo desde
        // acá cuesta 1 vida, sin importar el valor de quedanReintentos.
        assertThat(EstadoNodo.FALLADO.alFallar(true)).isEqualTo(EstadoNodo.FALLADO);
        assertThat(EstadoNodo.FALLADO.alFallar(false)).isEqualTo(EstadoNodo.FALLADO);
    }

    @Test
    void fallado_noTieneTransicionAHabilitado_eseGateEsDelAlumnoNoDelNodo() {
        assertThatThrownBy(() -> EstadoNodo.FALLADO.alHabilitar())
            .isInstanceOf(TransicionInvalidaException.class);
    }

    @Test
    void completado_esTerminal_cualquierTransicionExplota() {
        assertThatThrownBy(() -> EstadoNodo.COMPLETADO.alHabilitar())
            .isInstanceOf(TransicionInvalidaException.class);
        assertThatThrownBy(() -> EstadoNodo.COMPLETADO.alCompletar())
            .isInstanceOf(TransicionInvalidaException.class);
        assertThatThrownBy(() -> EstadoNodo.COMPLETADO.alFallar(true))
            .isInstanceOf(TransicionInvalidaException.class);
    }

    @Test
    void bloqueado_noPuedeCompletarseNiFallarSinPasarPorHabilitado() {
        assertThatThrownBy(() -> EstadoNodo.BLOQUEADO.alCompletar())
            .isInstanceOf(TransicionInvalidaException.class);
        assertThatThrownBy(() -> EstadoNodo.BLOQUEADO.alFallar(true))
            .isInstanceOf(TransicionInvalidaException.class);
    }
}
