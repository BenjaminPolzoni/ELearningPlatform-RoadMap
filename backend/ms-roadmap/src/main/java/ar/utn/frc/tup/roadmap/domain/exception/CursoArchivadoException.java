package ar.utn.frc.tup.roadmap.domain.exception;

import java.util.UUID;

/**
 * Se intentó escribir sobre un curso ya archivado. RF-CUR-09 / contrato §0.5 → 409:
 * el roadmap y el ranking de un curso archivado quedan en modo lectura.
 */
public class CursoArchivadoException extends RuntimeException {

    public CursoArchivadoException(UUID cursoCohorteId) {
        super("El curso " + cursoCohorteId + " está archivado: Roadmap y Ranking son de solo lectura");
    }
}
