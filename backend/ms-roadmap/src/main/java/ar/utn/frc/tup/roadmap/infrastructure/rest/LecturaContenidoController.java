package ar.utn.frc.tup.roadmap.infrastructure.rest;

import ar.utn.frc.tup.roadmap.application.usecase.LecturaContenidoService;
import ar.utn.frc.tup.roadmap.infrastructure.rest.dto.AvanceLecturaUnidadResponse;
import ar.utn.frc.tup.roadmap.infrastructure.rest.dto.LecturaContenidoResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Registro idempotente de lectura de contenido teórico. El alumno nunca se toma de la
 * URL: lo autentica el Gateway y lo inyecta en X-User-Id.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("${app.api.base-path:/api/roadmap}")
public class LecturaContenidoController {

    private final LecturaContenidoService lecturaService;

    @PostMapping("/roadmaps/{cc}/nodos/{nodoId}/lectura")
    public ResponseEntity<LecturaContenidoResponse> marcarLeido(
        @PathVariable("cc") UUID cursoCohorteId,
        @PathVariable("nodoId") UUID nodoId,
        @RequestHeader(value = "X-User-Id", required = false) UUID alumnoId
    ) {
        LecturaContenidoResponse respuesta =
            lecturaService.marcarLeido(alumnoId, cursoCohorteId, nodoId);
        return respuesta.nueva()
            ? ResponseEntity.status(HttpStatus.CREATED).body(respuesta)
            : ResponseEntity.ok(respuesta);
    }

    @GetMapping("/roadmaps/{cc}/unidades/{unidadId}/avance-lectura")
    public ResponseEntity<AvanceLecturaUnidadResponse> avanceUnidad(
        @PathVariable("cc") UUID cursoCohorteId,
        @PathVariable("unidadId") UUID unidadId,
        @RequestHeader(value = "X-User-Id", required = false) UUID alumnoId
    ) {
        return ResponseEntity.ok(lecturaService.avanceUnidad(alumnoId, cursoCohorteId, unidadId));
    }

    /** Alias del contrato que denomina a la unidad como sección. */
    @GetMapping("/roadmaps/{cc}/secciones/{seccionId}/avance-lectura")
    public ResponseEntity<AvanceLecturaUnidadResponse> avanceSeccion(
        @PathVariable("cc") UUID cursoCohorteId,
        @PathVariable("seccionId") UUID seccionId,
        @RequestHeader(value = "X-User-Id", required = false) UUID alumnoId
    ) {
        return avanceUnidad(cursoCohorteId, seccionId, alumnoId);
    }
}
