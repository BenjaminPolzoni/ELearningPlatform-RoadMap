package ar.utn.frc.tup.roadmap.domain.exception;

import java.util.UUID;

/**
 * La sección no existe, está dada de baja, o no pertenece al roadmap del
 * {@code curso_cohorte_id} del path — no se distingue el caso a propósito, para no
 * filtrar la existencia de recursos de otro curso (contrato §0.5 → 404).
 */
public class SeccionNoEncontradaException extends RuntimeException {

    public SeccionNoEncontradaException(UUID seccionId) {
        super("No existe (o está dada de baja) la sección " + seccionId + " en este roadmap");
    }
}
