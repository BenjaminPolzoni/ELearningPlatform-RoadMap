package ar.utn.frc.tup.roadmap.domain.service;

import static org.assertj.core.api.Assertions.assertThat;

import ar.utn.frc.tup.roadmap.domain.model.InsumoAlumnoRanking;
import ar.utn.frc.tup.roadmap.domain.model.PosicionRanking;
import ar.utn.frc.tup.roadmap.domain.model.Zona;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

/** Dominio puro: orden con cascada de desempate, percentil y zona. Sin Spring. */
class CalculadoraRankingTest {

    private final CalculadoraRanking calc = new CalculadoraRanking();

    private static InsumoAlumnoRanking alumno(int xp, long insignias, int perdidas, int completados, int pctOblig) {
        return new InsumoAlumnoRanking(UUID.randomUUID(), xp, insignias, perdidas, completados, pctOblig);
    }

    @Test
    void ordenaPorXpDesc_yAsignaPosicion() {
        var a = alumno(100, 0, 0, 0, 0);
        var b = alumno(300, 0, 0, 0, 0);
        var c = alumno(200, 0, 0, 0, 0);

        List<PosicionRanking> r = calc.calcular(List.of(a, b, c), 3);

        assertThat(r).extracting(PosicionRanking::alumnoId)
            .containsExactly(b.alumnoId(), c.alumnoId(), a.alumnoId());
        assertThat(r).extracting(PosicionRanking::posicion).containsExactly(1, 2, 3);
    }

    @Test
    void empateDeXp_rompeCascadaRfRnk11() {
        // mismo XP: gana más insignias; luego menos vidas perdidas; luego más ejercicios.
        var masInsignias = alumno(500, 5, 3, 1, 0);
        var menosVidas = alumno(500, 2, 0, 1, 0);
        var masEjercicios = alumno(500, 2, 3, 9, 0);

        List<PosicionRanking> r = calc.calcular(List.of(menosVidas, masEjercicios, masInsignias), 3);

        assertThat(r).extracting(PosicionRanking::alumnoId)
            .containsExactly(masInsignias.alumnoId(), menosVidas.alumnoId(), masEjercicios.alumnoId());
    }

    @Test
    void menosDe10Inscriptos_sinPercentilesNiZonas() {
        List<PosicionRanking> r = calc.calcular(List.of(alumno(100, 0, 0, 0, 0), alumno(50, 0, 0, 0, 0)), 9);

        assertThat(r).allSatisfy(p -> {
            assertThat(p.percentil()).isNull();
            assertThat(p.zona()).isEqualTo(Zona.NINGUNA);
        });
    }

    @Test
    void con10OMasInscriptos_primeroP90_ultimoP10() {
        // 11 alumnos con XP 110,100,...,10 → primero percentil 100 (P90), último 0 (P10).
        List<InsumoAlumnoRanking> insumos = IntStream.rangeClosed(1, 11)
            .mapToObj(i -> alumno(i * 10, 0, 0, 0, 100))
            .toList();

        List<PosicionRanking> r = calc.calcular(insumos, 11);

        assertThat(r.get(0).percentil()).isEqualTo(100.0);
        assertThat(r.get(0).zona()).isEqualTo(Zona.P90);
        assertThat(r.get(10).percentil()).isEqualTo(0.0);
        assertThat(r.get(10).zona()).isEqualTo(Zona.P10);
        assertThat(r.get(5).zona()).isEqualTo(Zona.NINGUNA);
    }

    @Test
    void candidatoPromocion_soloConP90_sinVidasPerdidas_y100PctObligatorios() {
        List<InsumoAlumnoRanking> insumos = new java.util.ArrayList<>(
            IntStream.rangeClosed(1, 10).mapToObj(i -> alumno(i, 0, 1, 0, 50)).toList()
        );
        var puntero = alumno(1000, 0, 0, 0, 100); // P90, 0 vidas perdidas, 100% obligatorios
        insumos.add(puntero);

        List<PosicionRanking> r = calc.calcular(insumos, 11);

        PosicionRanking fila = r.stream().filter(p -> p.alumnoId().equals(puntero.alumnoId())).findFirst().orElseThrow();
        assertThat(fila.zona()).isEqualTo(Zona.P90);
        assertThat(fila.candidatoPromocion()).isTrue();
        assertThat(r.stream().filter(PosicionRanking::candidatoPromocion)).hasSize(1);
    }

    @Test
    void riesgoRegularidad_enP10_yNoAproboTodosLosObligatorios() {
        List<InsumoAlumnoRanking> insumos = new java.util.ArrayList<>(
            IntStream.rangeClosed(1, 10).mapToObj(i -> alumno(i * 100, 0, 0, 0, 100)).toList()
        );
        var farol = alumno(1, 0, 0, 0, 40); // último => P10, 40% obligatorios
        insumos.add(farol);

        List<PosicionRanking> r = calc.calcular(insumos, 11);

        PosicionRanking fila = r.stream().filter(p -> p.alumnoId().equals(farol.alumnoId())).findFirst().orElseThrow();
        assertThat(fila.zona()).isEqualTo(Zona.P10);
        assertThat(fila.riesgoRegularidad()).isTrue();
    }
}
