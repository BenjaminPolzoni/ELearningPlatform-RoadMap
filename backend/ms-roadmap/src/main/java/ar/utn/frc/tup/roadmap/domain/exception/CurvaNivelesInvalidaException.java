package ar.utn.frc.tup.roadmap.domain.exception;

/**
 * La curva de niveles propuesta viola una invariante: vacía, más de 10 (RF-NIV-04),
 * umbral_xp no estrictamente creciente, o no arranca en 0. Contrato §0.5 → 400.
 */
public class CurvaNivelesInvalidaException extends RuntimeException {

    public CurvaNivelesInvalidaException(String motivo) {
        super(motivo);
    }
}
