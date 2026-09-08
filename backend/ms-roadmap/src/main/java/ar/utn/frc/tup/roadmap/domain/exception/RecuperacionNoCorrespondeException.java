package ar.utn.frc.tup.roadmap.domain.exception;

import java.util.UUID;

/** RF-REC-04: el desafío de recuperación solo se ofrece con 0 vidas vigentes. */
public class RecuperacionNoCorrespondeException extends RuntimeException {

    public RecuperacionNoCorrespondeException(UUID alumnoId, int vidasVigentes) {
        super("Alumno " + alumnoId + " tiene " + vidasVigentes
            + " vidas vigentes — la recuperación solo corresponde con 0");
    }
}
