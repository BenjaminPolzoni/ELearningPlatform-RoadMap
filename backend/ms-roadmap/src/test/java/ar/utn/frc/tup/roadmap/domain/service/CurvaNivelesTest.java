package ar.utn.frc.tup.roadmap.domain.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ar.utn.frc.tup.roadmap.domain.exception.CurvaNivelesInvalidaException;
import ar.utn.frc.tup.roadmap.domain.model.Nivel;
import ar.utn.frc.tup.roadmap.domain.service.CurvaNiveles.Definicion;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

/** Dominio puro (E6): sin Spring ni Mockito. */
class CurvaNivelesTest {

    @Test
    void par09_tiene_los_10_niveles_de_la_tabla() {
        List<Nivel> n = CurvaNiveles.par09().niveles();

        assertThat(n).hasSize(10);
        assertThat(n).extracting(Nivel::umbralXp)
            .containsExactly(0, 250, 600, 1100, 1800, 2800, 4200, 6000, 8500, 12000);
        assertThat(n).extracting(Nivel::orden).containsExactly(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
    }

    @Test
    void nivelPara_devuelve_el_ultimo_umbral_alcanzado() {
        CurvaNiveles curva = CurvaNiveles.par09();

        assertThat(curva.nivelPara(0).orden()).isEqualTo(1);
        assertThat(curva.nivelPara(249).orden()).isEqualTo(1);
        assertThat(curva.nivelPara(250).orden()).isEqualTo(2);
        assertThat(curva.nivelPara(11999).orden()).isEqualTo(9);
        assertThat(curva.nivelPara(12000).orden()).isEqualTo(10);
        assertThat(curva.nivelPara(999_999).orden()).isEqualTo(10); // RF-NIV-05: sin techo
    }

    @Test
    void de_ordena_input_desordenado_y_asigna_orden_por_umbral() {
        CurvaNiveles curva = CurvaNiveles.de(List.of(
            new Definicion("C", 600),
            new Definicion("A", 0),
            new Definicion("B", 250)
        ));

        assertThat(curva.niveles()).extracting(Nivel::nombre).containsExactly("A", "B", "C");
        assertThat(curva.niveles()).extracting(Nivel::orden).containsExactly(1, 2, 3);
    }

    @Test
    void de_rechaza_curva_vacia() {
        assertThatThrownBy(() -> CurvaNiveles.de(List.of()))
            .isInstanceOf(CurvaNivelesInvalidaException.class);
    }

    @Test
    void de_rechaza_mas_de_10_niveles() {
        List<Definicion> once = IntStream.rangeClosed(0, 10)
            .mapToObj(i -> new Definicion("N" + i, i * 100))
            .toList();

        assertThatThrownBy(() -> CurvaNiveles.de(once))
            .isInstanceOf(CurvaNivelesInvalidaException.class)
            .hasMessageContaining("RF-NIV-04");
    }

    @Test
    void de_rechaza_primer_umbral_distinto_de_cero() {
        assertThatThrownBy(() -> CurvaNiveles.de(List.of(
            new Definicion("A", 100),
            new Definicion("B", 200)
        ))).isInstanceOf(CurvaNivelesInvalidaException.class);
    }

    @Test
    void de_rechaza_umbrales_no_estrictamente_crecientes() {
        assertThatThrownBy(() -> CurvaNiveles.de(List.of(
            new Definicion("A", 0),
            new Definicion("B", 250),
            new Definicion("C", 250)
        ))).isInstanceOf(CurvaNivelesInvalidaException.class);
    }
}
