package ar.utn.frc.tup.roadmap.infrastructure.rest;

import ar.utn.frc.tup.roadmap.application.usecase.ConexionService;
import ar.utn.frc.tup.roadmap.application.usecase.GrafoRoadmap;
import ar.utn.frc.tup.roadmap.application.usecase.NodoService;
import ar.utn.frc.tup.roadmap.application.usecase.RoadmapService;
import ar.utn.frc.tup.roadmap.application.usecase.SeccionService;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapConexionEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapNodoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapSeccionEntity;
import ar.utn.frc.tup.roadmap.infrastructure.rest.dto.ActualizarRoadmapRequest;
import ar.utn.frc.tup.roadmap.infrastructure.rest.dto.ActualizarSeccionRequest;
import ar.utn.frc.tup.roadmap.infrastructure.rest.dto.ConexionResponse;
import ar.utn.frc.tup.roadmap.infrastructure.rest.dto.CrearConexionRequest;
import ar.utn.frc.tup.roadmap.infrastructure.rest.dto.CrearRoadmapRequest;
import ar.utn.frc.tup.roadmap.infrastructure.rest.dto.CrearSeccionRequest;
import ar.utn.frc.tup.roadmap.infrastructure.rest.dto.GrafoRoadmapResponse;
import ar.utn.frc.tup.roadmap.infrastructure.rest.dto.GuardarNodoRequest;
import ar.utn.frc.tup.roadmap.infrastructure.rest.dto.NodoResponse;
import ar.utn.frc.tup.roadmap.infrastructure.rest.dto.RoadmapResponse;
import ar.utn.frc.tup.roadmap.infrastructure.rest.dto.SeccionResponse;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Grafo del roadmap — contrato completo en path/06-contrato-api.md §1. Empezó como el
 * slice de referencia (POST/GET /roadmaps) y ahora cubre todo el CRUD del grafo:
 * secciones, nodos y conexiones.
 *
 * <p>Base path {@code ${app.api.base-path}} (default {@code /api/roadmap}): el Gateway
 * reenvía el path completo sin reescribir (deck Tema 01, slide 25) — nuestro
 * {@code @RequestMapping} refleja exactamente el path externo.
 *
 * <p>Toda escritura del grafo es de PROFESOR (contrato §1). El chequeo de rol es una
 * concesión temporal ({@code exigirRolProfesor}) mientras el Gateway real no esté
 * integrado — ver deuda-tecnica/tarea-deuda-06-contrato-api.md #4.
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("${app.api.base-path:/api/roadmap}")
public class RoadmapController {

    private final RoadmapService roadmapService;
    private final SeccionService seccionService;
    private final NodoService nodoService;
    private final ConexionService conexionService;

    // ── Roadmap ──────────────────────────────────────────────────────────

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

    @GetMapping("/roadmaps/{cc}")
    public ResponseEntity<GrafoRoadmapResponse> obtenerGrafo(@PathVariable("cc") UUID cursoCohorteId) {
        GrafoRoadmap grafo = roadmapService.obtenerGrafo(cursoCohorteId);
        return ResponseEntity.ok(GrafoRoadmapResponse.armar(
            grafo.roadmap(), grafo.seccionesOrdenadas(), grafo.nodos(), grafo.conexiones()
        ));
    }

    @PutMapping("/roadmaps/{cc}")
    public ResponseEntity<RoadmapResponse> actualizar(
        @PathVariable("cc") UUID cursoCohorteId,
        @Valid @RequestBody ActualizarRoadmapRequest request,
        @RequestHeader(value = "X-User-Roles", required = false) String rolesHeader
    ) {
        exigirRolProfesor(rolesHeader);
        RoadmapEntity actualizado = roadmapService.actualizarEstado(cursoCohorteId, request.estado());
        return ResponseEntity.ok(RoadmapResponse.desde(actualizado));
    }

    // ── Secciones ────────────────────────────────────────────────────────

    @PostMapping("/roadmaps/{cc}/secciones")
    public ResponseEntity<SeccionResponse> crearSeccion(
        @PathVariable("cc") UUID cursoCohorteId,
        @Valid @RequestBody CrearSeccionRequest request,
        @RequestHeader(value = "X-User-Roles", required = false) String rolesHeader
    ) {
        exigirRolProfesor(rolesHeader);
        RoadmapSeccionEntity creada = seccionService.crear(
            cursoCohorteId, request.nombre(), request.umbralXpDesbloqueo(), request.orden()
        );
        return ResponseEntity
            .created(URI.create("/roadmaps/" + cursoCohorteId + "/secciones/" + creada.getId()))
            .body(SeccionResponse.desde(creada));
    }

    @PutMapping("/roadmaps/{cc}/secciones/{id}")
    public ResponseEntity<SeccionResponse> actualizarSeccion(
        @PathVariable("cc") UUID cursoCohorteId,
        @PathVariable("id") UUID seccionId,
        @Valid @RequestBody ActualizarSeccionRequest request,
        @RequestHeader(value = "X-User-Roles", required = false) String rolesHeader
    ) {
        exigirRolProfesor(rolesHeader);
        RoadmapSeccionEntity actualizada = seccionService.actualizar(
            cursoCohorteId, seccionId, request.nombre(), request.umbralXpDesbloqueo(), request.orden()
        );
        return ResponseEntity.ok(SeccionResponse.desde(actualizada));
    }

    @DeleteMapping("/roadmaps/{cc}/secciones/{id}")
    public ResponseEntity<Void> eliminarSeccion(
        @PathVariable("cc") UUID cursoCohorteId,
        @PathVariable("id") UUID seccionId,
        @RequestHeader(value = "X-User-Roles", required = false) String rolesHeader
    ) {
        exigirRolProfesor(rolesHeader);
        seccionService.eliminar(cursoCohorteId, seccionId);
        return ResponseEntity.noContent().build();
    }

    // ── Nodos ────────────────────────────────────────────────────────────

    @PostMapping("/roadmaps/{cc}/nodos")
    public ResponseEntity<NodoResponse> crearNodo(
        @PathVariable("cc") UUID cursoCohorteId,
        @Valid @RequestBody GuardarNodoRequest request,
        @RequestHeader(value = "X-User-Roles", required = false) String rolesHeader
    ) {
        exigirRolProfesor(rolesHeader);
        RoadmapNodoEntity creado = nodoService.crear(
            cursoCohorteId, request.seccionId(), request.tipo(), request.desafioId(),
            request.posicionX(), request.posicionY(),
            request.esObligatorioOrDefault(), request.reintentosPermitidosOrDefault()
        );
        return ResponseEntity
            .created(URI.create("/roadmaps/" + cursoCohorteId + "/nodos/" + creado.getId()))
            .body(NodoResponse.desde(creado));
    }

    @PutMapping("/roadmaps/{cc}/nodos/{id}")
    public ResponseEntity<NodoResponse> actualizarNodo(
        @PathVariable("cc") UUID cursoCohorteId,
        @PathVariable("id") UUID nodoId,
        @Valid @RequestBody GuardarNodoRequest request,
        @RequestHeader(value = "X-User-Roles", required = false) String rolesHeader
    ) {
        exigirRolProfesor(rolesHeader);
        RoadmapNodoEntity actualizado = nodoService.actualizar(
            cursoCohorteId, nodoId, request.seccionId(), request.tipo(), request.desafioId(),
            request.posicionX(), request.posicionY(),
            request.esObligatorioOrDefault(), request.reintentosPermitidosOrDefault()
        );
        return ResponseEntity.ok(NodoResponse.desde(actualizado));
    }

    @DeleteMapping("/roadmaps/{cc}/nodos/{id}")
    public ResponseEntity<Void> eliminarNodo(
        @PathVariable("cc") UUID cursoCohorteId,
        @PathVariable("id") UUID nodoId,
        @RequestHeader(value = "X-User-Roles", required = false) String rolesHeader
    ) {
        exigirRolProfesor(rolesHeader);
        nodoService.eliminar(cursoCohorteId, nodoId);
        return ResponseEntity.noContent().build();
    }

    // ── Conexiones ───────────────────────────────────────────────────────

    @PostMapping("/roadmaps/{cc}/conexiones")
    public ResponseEntity<ConexionResponse> crearConexion(
        @PathVariable("cc") UUID cursoCohorteId,
        @Valid @RequestBody CrearConexionRequest request,
        @RequestHeader(value = "X-User-Roles", required = false) String rolesHeader
    ) {
        exigirRolProfesor(rolesHeader);
        RoadmapConexionEntity creada = conexionService.crear(
            cursoCohorteId, request.nodoOrigenId(), request.nodoDestinoId()
        );
        return ResponseEntity
            .created(URI.create("/roadmaps/" + cursoCohorteId + "/conexiones/" + creada.getId()))
            .body(ConexionResponse.desde(creada));
    }

    @DeleteMapping("/roadmaps/{cc}/conexiones/{id}")
    public ResponseEntity<Void> eliminarConexion(
        @PathVariable("cc") UUID cursoCohorteId,
        @PathVariable("id") UUID conexionId,
        @RequestHeader(value = "X-User-Roles", required = false) String rolesHeader
    ) {
        exigirRolProfesor(rolesHeader);
        conexionService.eliminar(cursoCohorteId, conexionId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Autorización de NEGOCIO (§0.3 del contrato) — el Gateway ya validó el token (401);
     * acá decidimos el rol. Local dev sin Gateway real todavía no manda el header: se
     * deja pasar con warning en vez de romper el flujo de desarrollo. TODO Fase 1: fallar
     * duro (403) cuando el Gateway esté integrado de verdad — deuda-tecnica #4.
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
