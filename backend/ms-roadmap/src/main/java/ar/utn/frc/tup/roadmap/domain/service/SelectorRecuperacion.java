package ar.utn.frc.tup.roadmap.domain.service;

import java.util.List;
import java.util.Random;
import java.util.UUID;

/**
 * RF-REC-06: "el sistema elige uno al azar priorizando los que el alumno no resolvió
 * antes". Si ya resolvió todos alguna vez, recicla eligiendo de todo el pool — nunca deja
 * al alumno sin desafío de recuperación ofrecible mientras el pool no esté vacío.
 *
 * <p>Recibe el {@link Random} por constructor a propósito: en test se pasa uno con seed
 * fija para que la elección sea determinística sin mockear nada.
 */
public class SelectorRecuperacion {

    private final Random random;

    public SelectorRecuperacion(Random random) {
        this.random = random;
    }

    public UUID elegir(List<UUID> poolDesafioIds, List<UUID> yaResueltosDesafioIds) {
        if (poolDesafioIds.isEmpty()) {
            throw new IllegalArgumentException("El pool de recuperación está vacío");
        }

        List<UUID> noResueltos = poolDesafioIds.stream()
            .filter(id -> !yaResueltosDesafioIds.contains(id))
            .toList();

        List<UUID> candidatos = noResueltos.isEmpty() ? poolDesafioIds : noResueltos;
        return candidatos.get(random.nextInt(candidatos.size()));
    }
}
