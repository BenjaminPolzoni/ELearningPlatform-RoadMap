package ar.utn.frc.tup.roadmap.infrastructure.rest;

import ar.utn.frc.tup.roadmap.application.usecase.RoadmapService;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapEntity;
import ar.utn.frc.tup.roadmap.infrastructure.rest.dto.CrearRoadmapRequest;
import ar.utn.frc.tup.roadmap.infrastructure.rest.dto.RoadmapResponse;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Slice de referencia — ver path/06-contrato-api.md §1 para el contrato completo del grafo.
 *
 * <p>Base path {@code ${app.api.base-path}} (default {@code /api/roadmap}): el Gateway
 * reenvía el path completo sin reescribir (deck Tema 01, slide 25) — nuestro
 * {@code @RequestMapping} refleja exactamente el path externo.
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("${app.api.base-path:/api/roadmap}")
public class RoadmapController {

    private final RoadmapService roadmapService;

    @PostMapping("/roadmaps")
    public ResponseEntity<RoadmapResponse> crear(
        @Valid @RequestBody CrearRoadmapRequest request,
        @RequestHeader(value = "X-User-Roles", required = false) String rolesHeader
    ) {
        exigirRolProfesor(rolesHeader);
        RoadmapEntity creado = roadmapService.crear(request.cursoCohorteId());
        return ResponseEntity
            .created(URI.create("/roadmaps/" + creado.getCursoCohorteId()))
            .body(RoadmapResponse.desde(creado));
    }

    @GetMapping("/roadmaps/{cursoCohorteId}")
    public ResponseEntity<RoadmapResponse> obtener(@PathVariable UUID cursoCohorteId) {
        RoadmapEntity roadmap = roadmapService.obtenerPorCursoCohorte(cursoCohorteId);
        return ResponseEntity.ok(RoadmapResponse.desde(roadmap));
    }

    /**
     * Autorización de NEGOCIO (§0.3 del contrato) — el Gateway ya validó el token (401);
     * acá decidimos el rol. Local dev sin Gateway real todavía no manda el header: se
     * deja pasar con warning en vez de romper el flujo de desarrollo. TODO Fase 1: fallar
     * duro (403) cuando el Gateway esté integrado de verdad.
     */
    private void exigirRolProfesor(String rolesHeader) {
        if (rolesHeader == null) {
            log.warn("X-User-Roles ausente — dev local sin Gateway. No se debe deployar así.");
            return;
        }
        if (!rolesHeader.contains("PROFESOR")) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN,
                "Requiere rol PROFESOR"
            );
        }
    }
}
