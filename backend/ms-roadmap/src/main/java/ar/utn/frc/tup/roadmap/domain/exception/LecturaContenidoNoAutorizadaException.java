package ar.utn.frc.tup.roadmap.domain.exception;

public class LecturaContenidoNoAutorizadaException extends RuntimeException {

    public LecturaContenidoNoAutorizadaException(String detalle) {
        super(detalle);
    }
}
