package ar.utn.frc.tup.roadmap.domain.exception;

import java.util.UUID;

/** La conexión no existe, está dada de baja, o es de otro roadmap (contrato §0.5 → 404). */
public class ConexionNoEncontradaException extends RuntimeException {

    public ConexionNoEncontradaException(UUID conexionId) {
        super("No existe (o está dada de baja) la conexión " + conexionId + " en este roadmap");
    }
}
