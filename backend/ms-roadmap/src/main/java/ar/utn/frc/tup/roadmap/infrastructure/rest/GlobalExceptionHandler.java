package ar.utn.frc.tup.roadmap.infrastructure.rest;

import ar.utn.frc.tup.roadmap.domain.exception.PoolRecuperacionVacioException;
import ar.utn.frc.tup.roadmap.domain.exception.RecuperacionNoCorrespondeException;
import ar.utn.frc.tup.roadmap.domain.exception.RoadmapNoEncontradoException;
import ar.utn.frc.tup.roadmap.domain.exception.RoadmapYaExisteException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.server.ResponseStatusException;

/**
 * Todo error va como {@code application/problem+json} (RFC 9457) — path/06-contrato-api.md §0.5.
 * El 401 lo emite el Gateway, no nosotros; acá solo 403/404/409 de negocio.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RoadmapNoEncontradoException.class)
    public ProblemDetail manejarNoEncontrado(RoadmapNoEncontradoException ex, WebRequest req) {
        return construir(HttpStatus.NOT_FOUND, ex.getMessage(), req);
    }

    @ExceptionHandler(RoadmapYaExisteException.class)
    public ProblemDetail manejarConflicto(RoadmapYaExisteException ex, WebRequest req) {
        return construir(HttpStatus.CONFLICT, ex.getMessage(), req);
    }

    @ExceptionHandler(RecuperacionNoCorrespondeException.class)
    public ProblemDetail manejarRecuperacionNoCorresponde(RecuperacionNoCorrespondeException ex, WebRequest req) {
        return construir(HttpStatus.CONFLICT, ex.getMessage(), req);
    }

    @ExceptionHandler(PoolRecuperacionVacioException.class)
    public ProblemDetail manejarPoolVacio(PoolRecuperacionVacioException ex, WebRequest req) {
        return construir(HttpStatus.CONFLICT, ex.getMessage(), req);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ProblemDetail manejarResponseStatus(ResponseStatusException ex, WebRequest req) {
        return construir(HttpStatus.valueOf(ex.getStatusCode().value()), ex.getReason(), req);
    }

    private ProblemDetail construir(HttpStatus status, String detail, WebRequest req) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detail);
        String traceId = req.getHeader("X-Request-Id");
        if (traceId != null) {
            pd.setProperty("traceId", traceId);
        }
        return pd;
    }
}
