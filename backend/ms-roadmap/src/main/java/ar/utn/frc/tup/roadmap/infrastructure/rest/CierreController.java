package ar.utn.frc.tup.roadmap.infrastructure.rest;

import ar.utn.frc.tup.roadmap.application.usecase.CierreService;
import ar.utn.frc.tup.roadmap.application.usecase.CierreService.CandidatoCierre;
import ar.utn.frc.tup.roadmap.application.usecase.CierreService.EstadoCierre;
import ar.utn.frc.tup.roadmap.application.usecase.CierreService.FilaReporte;
import ar.utn.frc.tup.roadmap.application.usecase.CierreService.ItemConfirmacion;
import ar.utn.frc.tup.roadmap.infrastructure.rest.dto.ConfirmarCierreRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Cierre de curso — contrato §4. {@code /cierre/estado} es interno (lo llama Cursos vía
 * Gateway con token de servicio); el resto es PROFESOR (el reporte también ADMIN).
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("${app.api.base-path:/api/roadmap}")
public class CierreController {

    private final CierreService cierreService;

    @GetMapping("/roadmaps/{cc}/cierre/candidatos")
    public ResponseEntity<List<CandidatoCierre>> candidatos(
        @PathVariable("cc") UUID cursoCohorteId,
        @RequestHeader(value = "X-User-Roles", required = false) String rolesHeader
    ) {
        exigirRol(rolesHeader, "PROFESOR");
        return ResponseEntity.ok(cierreService.candidatos(cursoCohorteId));
    }

    @PostMapping("/roadmaps/{cc}/cierre/confirmar")
    public ResponseEntity<Void> confirmar(
        @PathVariable("cc") UUID cursoCohorteId,
        @Valid @RequestBody ConfirmarCierreRequest request,
        @RequestHeader(value = "X-User-Roles", required = false) String rolesHeader,
        @RequestHeader(value = "X-User-Id", required = false) UUID userId
    ) {
        exigirRol(rolesHeader, "PROFESOR");
        List<ItemConfirmacion> items = request.items().stream()
            .map(i -> new ItemConfirmacion(i.alumnoId(), i.estado()))
            .toList();
        cierreService.confirmar(cursoCohorteId, items, userId != null ? userId : SISTEMA);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/roadmaps/{cc}/cierre/reporte")
    public ResponseEntity<List<FilaReporte>> reporte(
        @PathVariable("cc") UUID cursoCohorteId,
        @RequestHeader(value = "X-User-Roles", required = false) String rolesHeader
    ) {
        exigirAlgunRol(rolesHeader, "PROFESOR", "ADMIN");
        return ResponseEntity.ok(cierreService.reporte(cursoCohorteId));
    }

    /** Interno: Cursos lo consulta antes de archivar (RF-CUR-08b). Sin gate de rol de persona. */
    @GetMapping("/roadmaps/{cc}/cierre/estado")
    public ResponseEntity<EstadoCierre> estado(@PathVariable("cc") UUID cursoCohorteId) {
        return ResponseEntity.ok(cierreService.estadoParaArchivar(cursoCohorteId));
    }

    // ponytail: mismo apaño de dev local sin Gateway que el resto de los controllers (deuda #4).
    private static final UUID SISTEMA = new UUID(0L, 0L);

    private void exigirRol(String rolesHeader, String rol) {
        exigirAlgunRol(rolesHeader, rol);
    }

    private void exigirAlgunRol(String rolesHeader, String... roles) {
        if (rolesHeader == null) {
            log.warn("X-User-Roles ausente — dev local sin Gateway. No se debe deployar así.");
            return;
        }
        for (String rol : roles) {
            if (rolesHeader.contains(rol)) {
                return;
            }
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Requiere rol " + String.join(" o ", roles));
    }
}
