package ar.utn.frc.tup.roadmap.domain.exception;

/**
 * Los atributos del nodo son incoherentes entre sí — hoy el único caso es un
 * {@code HITO} con {@code desafioId} (un hito es un marcador sin evaluación, no
 * referencia contenido del Motor de Desafíos). Contrato §0.5 → 400.
 */
public class NodoInvalidoException extends RuntimeException {

    public NodoInvalidoException(String motivo) {
        super(motivo);
    }
}
