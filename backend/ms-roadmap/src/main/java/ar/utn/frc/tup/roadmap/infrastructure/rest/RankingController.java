package ar.utn.frc.tup.roadmap.infrastructure.rest;

import ar.utn.frc.tup.roadmap.application.usecase.RankingService;
import ar.utn.frc.tup.roadmap.application.usecase.RankingService.CandidatosRanking;
import ar.utn.frc.tup.roadmap.application.usecase.RankingService.VistaRankingAlumno;
import ar.utn.frc.tup.roadmap.domain.model.PosicionRanking;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Ranking por cohorte — contrato §3. La respuesta de {@code GET /ranking} <b>cambia según
 * el rol</b> del token (el filtrado es del servidor, nunca del front): PROFESOR ve la
 * tabla entera, ALUMNO ve su fila + top3 + bottom3 + cortes anónimos (RF-RNK-03/07).
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("${app.api.base-path:/api/roadmap}")
public class RankingController {

    private final RankingService rankingService;

    @GetMapping("/roadmaps/{cc}/ranking")
    public ResponseEntity<?> ranking(
        @PathVariable("cc") UUID cursoCohorteId,
        @RequestHeader(value = "X-User-Roles", required = false) String rolesHeader,
        @RequestHeader(value = "X-User-Id", required = false) UUID userId
    ) {
        if (esAlumnoNoProfesor(rolesHeader)) {
            if (userId == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Falta X-User-Id para la vista de ALUMNO");
            }
            VistaRankingAlumno vista = rankingService.vistaAlumno(cursoCohorteId, userId);
            return ResponseEntity.ok(vista);
        }
        List<PosicionRanking> completo = rankingService.rankingCompleto(cursoCohorteId);
        return ResponseEntity.ok(completo);
    }

    @GetMapping("/roadmaps/{cc}/ranking/candidatos")
    public ResponseEntity<CandidatosRanking> candidatos(
        @PathVariable("cc") UUID cursoCohorteId,
        @RequestHeader(value = "X-User-Roles", required = false) String rolesHeader
    ) {
        exigirRolProfesor(rolesHeader);
        return ResponseEntity.ok(rankingService.candidatos(cursoCohorteId));
    }

    /**
     * ponytail: misma concesión de dev local que RoadmapController.exigirRolProfesor
     * (sin Gateway, el header no llega) — se endurece a 403 junto con esa, deuda #4.
     */
    private boolean esAlumnoNoProfesor(String rolesHeader) {
        return rolesHeader != null && rolesHeader.contains("ALUMNO") && !rolesHeader.contains("PROFESOR");
    }

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
