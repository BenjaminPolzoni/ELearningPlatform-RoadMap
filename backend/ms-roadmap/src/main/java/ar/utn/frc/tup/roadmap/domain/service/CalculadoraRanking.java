package ar.utn.frc.tup.roadmap.domain.service;

import ar.utn.frc.tup.roadmap.domain.model.CandidatoRanking;
import ar.utn.frc.tup.roadmap.domain.model.InsumoAlumnoRanking;
import ar.utn.frc.tup.roadmap.domain.model.PosicionRanking;
import ar.utn.frc.tup.roadmap.domain.model.Zona;
import java.util.Comparator;
import java.util.List;

/**
 * Convierte la foto de cada alumno ({@link InsumoAlumnoRanking}) en la tabla ordenada
 * y clasificada del ranking. Dominio puro: sin JPA, sin Spring — se instancia con
 * {@code new} en el test (contrato §8, "el ranking se recalcula, no se edita" —
 * 02-modelo-de-datos.md §1.4).
 *
 * <p>Decisiones de cálculo (documentadas porque el PRD no fija fórmula exacta):
 * <ul>
 *   <li><b>Orden</b>: 1º XP real desc (RF-NIV-05, nunca por nivel); los empates se rompen
 *       con la cascada RF-RNK-11 — más insignias, luego menos vidas perdidas históricas,
 *       luego más ejercicios completados.</li>
 *   <li><b>Percentil</b>: {@code 100 * (n - posicion) / (n - 1)} — el primero queda en 100,
 *       el último en 0. Redondeado a un decimal. {@code null} si hay < 10 inscriptos
 *       activos (RF-RNK-09) o si hay un solo alumno.</li>
 *   <li><b>Zona</b>: P90 si {@code percentil >= 90}, P10 si {@code percentil <= 10}, si no
 *       NINGUNA. Con < 10 inscriptos, todos NINGUNA.</li>
 * </ul>
 */
public class CalculadoraRanking {

    private static final int MINIMO_INSCRIPTOS_PARA_ZONAS = 10; // RF-RNK-09

    private static final Comparator<InsumoAlumnoRanking> ORDEN_RANKING =
        Comparator.comparingInt(InsumoAlumnoRanking::xpTotal).reversed()
            .thenComparing(Comparator.comparingLong(InsumoAlumnoRanking::insigniasCount).reversed())
            .thenComparingInt(InsumoAlumnoRanking::vidasPerdidasHistorico)
            .thenComparing(Comparator.comparingInt(InsumoAlumnoRanking::ejerciciosCompletados).reversed());

    public List<PosicionRanking> calcular(List<InsumoAlumnoRanking> insumos, int inscriptosActivos) {
        List<InsumoAlumnoRanking> ordenados = insumos.stream().sorted(ORDEN_RANKING).toList();
        int n = ordenados.size();
        boolean zonasActivas = inscriptosActivos >= MINIMO_INSCRIPTOS_PARA_ZONAS;

        return java.util.stream.IntStream.range(0, n)
            .mapToObj(i -> {
                InsumoAlumnoRanking a = ordenados.get(i);
                int posicion = i + 1;
                Double percentil = (zonasActivas && n > 1)
                    ? redondear1(100.0 * (n - posicion) / (n - 1))
                    : null;
                Zona zona = zonaDe(percentil);
                CandidatoRanking c = new CandidatoRanking(
                    zona, a.vidasPerdidasHistorico(), a.porcentajeObligatoriosAprobados()
                );
                return new PosicionRanking(
                    a.alumnoId(), a.xpTotal(), posicion, percentil, zona,
                    a.insigniasCount(), a.vidasPerdidasHistorico(), a.ejerciciosCompletados(),
                    EspecificacionesRanking.ES_CANDIDATO_PROMOCION.cumple(c),
                    EspecificacionesRanking.ES_RIESGO_REGULARIDAD.cumple(c)
                );
            })
            .toList();
    }

    private static Zona zonaDe(Double percentil) {
        if (percentil == null) {
            return Zona.NINGUNA;
        }
        if (percentil >= 90.0) {
            return Zona.P90;
        }
        if (percentil <= 10.0) {
            return Zona.P10;
        }
        return Zona.NINGUNA;
    }

    private static double redondear1(double x) {
        return Math.round(x * 10.0) / 10.0;
    }
}
