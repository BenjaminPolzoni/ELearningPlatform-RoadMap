package ar.utn.frc.tup.roadmap.infrastructure.rest;

import ar.utn.frc.tup.roadmap.application.usecase.NivelesService;
import ar.utn.frc.tup.roadmap.domain.model.Nivel;
import ar.utn.frc.tup.roadmap.infrastructure.rest.dto.DefinirNivelesRequest;
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
 * Curva de niveles — contrato §3 (RF-NIV-03/04/05). {@code GET} lo ven PROFESOR y ALUMNO;
 * {@code POST} es solo PROFESOR (RF-CFG-05). Sin curva custom, el curso corre con la curva
 * por defecto del sistema (PAR-09), que igual sale por el {@code GET}.
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("${app.api.base-path:/api/roadmap}")
public class NivelesController {

    private final NivelesService nivelesService;

    @GetMapping("/roadmaps/{cc}/niveles")
    public ResponseEntity<List<Nivel>> curvaVigente(@PathVariable("cc") UUID cursoCohorteId) {
        return ResponseEntity.ok(nivelesService.curvaVigente(cursoCohorteId).niveles());
    }

    @PostMapping("/roadmaps/{cc}/niveles")
    public ResponseEntity<List<Nivel>> definir(
        @PathVariable("cc") UUID cursoCohorteId,
        @Valid @RequestBody DefinirNivelesRequest request,
        @RequestHeader(value = "X-User-Roles", required = false) String rolesHeader
    ) {
        exigirRolProfesor(rolesHeader);
        List<Nivel> curva = nivelesService.definirCurva(cursoCohorteId, request.aDefiniciones()).niveles();
        return ResponseEntity.status(HttpStatus.CREATED).body(curva);
    }

    /**
     * ponytail: tercera copia de la misma concesión de dev local que RoadmapController y
     * RankingController (sin Gateway el header no llega). Las tres se endurecen a 403 real
     * juntas — deuda-tecnica/tarea-deuda-06-contrato-api.md #4.
     */
    private void exigirRolProfesor(String rolesHeader) {
        if (rolesHeader == null) {
            log.warn("X-User-Roles ausente — dev local sin Gateway. No se debe deployar así.");
            return;
        }
        if (!rolesHeader.contains("PROFESOR")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Requiere rol PROFESOR");
        }
    }
}
