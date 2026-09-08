package ar.utn.frc.tup.roadmap.infrastructure.rest.dto;

import ar.utn.frc.tup.roadmap.domain.model.EstadoRoadmap;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapConexionEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapNodoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapSeccionEntity;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Vista de EDITOR de {@code GET /roadmaps/{cc}} (contrato §1): el grafo entero en un solo
 * viaje — metadata del roadmap + secciones ordenadas con sus nodos anidados + las
 * conexiones del roadmap. Es lo que el editor del profesor necesita para dibujar el mapa.
 *
 * <p>La vista de ALUMNO ("filtrada por progreso" en el contrato) todavía no está — ver
 * deuda-tecnica/tarea-deuda-06-contrato-api.md.
 */
public record GrafoRoadmapResponse(
    UUID id,
    UUID cursoCohorteId,
    EstadoRoadmap estado,
    Instant creadoEn,
    Instant actualizadoEn,
    List<SeccionConNodos> secciones,
    List<ConexionResponse> conexiones
) {

    public record SeccionConNodos(
        UUID id,
        UUID roadmapId,
        String nombre,
        Integer umbralXpDesbloqueo,
        Integer orden,
        List<NodoResponse> nodos
    ) {}

    public static GrafoRoadmapResponse armar(
        RoadmapEntity roadmap,
        List<RoadmapSeccionEntity> seccionesOrdenadas,
        List<RoadmapNodoEntity> nodos,
        List<RoadmapConexionEntity> conexiones
    ) {
        Map<UUID, List<NodoResponse>> nodosPorSeccion = nodos.stream()
            .collect(Collectors.groupingBy(
                RoadmapNodoEntity::getSeccionId,
                Collectors.mapping(NodoResponse::desde, Collectors.toList())
            ));

        List<SeccionConNodos> secciones = seccionesOrdenadas.stream()
            .map(s -> new SeccionConNodos(
                s.getId(), s.getRoadmapId(), s.getNombre(), s.getUmbralXpDesbloqueo(), s.getOrden(),
                nodosPorSeccion.getOrDefault(s.getId(), List.of())
            ))
            .toList();

        return new GrafoRoadmapResponse(
            roadmap.getId(), roadmap.getCursoCohorteId(), roadmap.getEstado(),
            roadmap.getCreadoEn(), roadmap.getActualizadoEn(),
            secciones,
            conexiones.stream().map(ConexionResponse::desde).toList()
        );
    }
}
