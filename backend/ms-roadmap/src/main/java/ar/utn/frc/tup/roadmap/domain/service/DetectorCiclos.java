package ar.utn.frc.tup.roadmap.domain.service;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;

/**
 * El grafo de prerequisitos ({@code RoadmapConexion}) tiene que ser un DAG: si existiera
 * un ciclo A→B→…→A, ninguno de esos nodos podría desbloquearse nunca (cada uno espera al
 * otro). No hay un RF que lo diga con esas palabras, pero se deduce de la máquina de
 * estados del nodo (02-modelo-de-datos.md §5): {@code BLOQUEADO→HABILITADO} depende de que
 * los prerequisitos estén {@code COMPLETADO}.
 *
 * <p>Dominio puro: no conoce JPA. Recibe la relación de adyacencia como una función
 * {@code nodoId → sucesores(nodoId)}, así se testea con un {@code Map} en memoria sin
 * levantar Spring (contrato §8).
 */
public class DetectorCiclos {

    /**
     * ¿Agregar la arista {@code origen → destino} cerraría un ciclo? Ocurre si y solo si
     * {@code destino} ya alcanza a {@code origen} siguiendo las conexiones existentes.
     * El auto-lazo ({@code origen == destino}) NO se evalúa acá — es una conexión
     * inválida por otra razón y se rechaza antes.
     *
     * @param sucesores dado un nodo, sus destinos directos por conexiones ya activas
     */
    public boolean creariaCiclo(UUID origen, UUID destino, Function<UUID, List<UUID>> sucesores) {
        Set<UUID> visitados = new HashSet<>();
        Deque<UUID> pendientes = new ArrayDeque<>();
        pendientes.push(destino);

        while (!pendientes.isEmpty()) {
            UUID actual = pendientes.pop();
            if (actual.equals(origen)) {
                return true;
            }
            if (!visitados.add(actual)) {
                continue;
            }
            pendientes.addAll(sucesores.apply(actual));
        }
        return false;
    }
}
