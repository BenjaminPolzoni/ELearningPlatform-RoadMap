package ar.utn.frc.tup.roadmap.domain.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import org.junit.jupiter.api.Test;

/** Dominio puro — la adyacencia es un {@code Map} en memoria, sin Spring ni JPA. */
class DetectorCiclosTest {

    private final DetectorCiclos detector = new DetectorCiclos();

    private static final UUID A = UUID.randomUUID();
    private static final UUID B = UUID.randomUUID();
    private static final UUID C = UUID.randomUUID();
    private static final UUID D = UUID.randomUUID();

    private static Function<UUID, List<UUID>> grafo(Map<UUID, List<UUID>> ady) {
        return n -> ady.getOrDefault(n, List.of());
    }

    @Test
    void sinRutaDeVuelta_noHayCiclo() {
        // A -> B ya existe; agregar B -> C no cierra nada.
        var sucesores = grafo(Map.of(A, List.of(B)));
        assertThat(detector.creariaCiclo(B, C, sucesores)).isFalse();
    }

    @Test
    void aristaDirectaDeVuelta_cierraCiclo() {
        // Ya existe A -> B; agregar B -> A cerraría A -> B -> A.
        var sucesores = grafo(Map.of(A, List.of(B)));
        assertThat(detector.creariaCiclo(B, A, sucesores)).isTrue();
    }

    @Test
    void aristaIndirectaDeVuelta_cierraCiclo() {
        // Ya existe A -> B -> C; agregar C -> A cerraría el triángulo.
        var sucesores = grafo(Map.of(A, List.of(B), B, List.of(C)));
        assertThat(detector.creariaCiclo(C, A, sucesores)).isTrue();
    }

    @Test
    void diamante_noEsCiclo() {
        // A -> B, A -> C, B -> D, C -> D. Agregar A -> D no crea ciclo (D no vuelve a A).
        var sucesores = grafo(Map.of(A, List.of(B, C), B, List.of(D), C, List.of(D)));
        assertThat(detector.creariaCiclo(A, D, sucesores)).isFalse();
    }

    @Test
    void grafoConCicloPreexistenteEnOtraRama_noConfundeLaBusqueda() {
        // B <-> C es un ciclo que ya está (no debería pasar, pero el detector no debe colgar).
        var sucesores = grafo(Map.of(B, List.of(C), C, List.of(B)));
        assertThat(detector.creariaCiclo(A, B, sucesores)).isFalse();
    }
}
