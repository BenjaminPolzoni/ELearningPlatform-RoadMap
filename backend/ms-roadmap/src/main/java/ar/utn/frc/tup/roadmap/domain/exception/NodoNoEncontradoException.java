package ar.utn.frc.tup.roadmap.domain.exception;

import java.util.UUID;

public class NodoNoEncontradoException extends RuntimeException {

    public NodoNoEncontradoException(UUID nodoId) {
        super("No existe (o está dado de baja) el nodo " + nodoId);
    }
}
