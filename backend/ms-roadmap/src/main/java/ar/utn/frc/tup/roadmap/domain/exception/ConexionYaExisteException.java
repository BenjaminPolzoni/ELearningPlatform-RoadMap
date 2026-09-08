package ar.utn.frc.tup.roadmap.domain.exception;

import java.util.UUID;

/** Ya hay una conexión activa con el mismo origen y destino (contrato §0.5 → 409). */
public class ConexionYaExisteException extends RuntimeException {

    public ConexionYaExisteException(UUID nodoOrigenId, UUID nodoDestinoId) {
        super("Ya existe una conexión activa " + nodoOrigenId + " -> " + nodoDestinoId);
    }
}
