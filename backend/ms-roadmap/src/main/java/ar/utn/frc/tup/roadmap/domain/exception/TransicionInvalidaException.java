package ar.utn.frc.tup.roadmap.domain.exception;

import ar.utn.frc.tup.roadmap.domain.model.EstadoNodo;

/** Se pidió una transición que el estado actual del nodo no permite. */
public class TransicionInvalidaException extends RuntimeException {

    public TransicionInvalidaException(EstadoNodo estadoActual, String transicion) {
        super("No se puede '" + transicion + "' un nodo en estado " + estadoActual);
    }
}
