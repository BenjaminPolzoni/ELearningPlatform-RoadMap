package ar.utn.frc.tup.roadmap.application.usecase;

import ar.utn.frc.tup.roadmap.domain.exception.RoadmapNoEncontradoException;
import ar.utn.frc.tup.roadmap.domain.exception.RoadmapYaExisteException;
import ar.utn.frc.tup.roadmap.domain.model.EstadoRoadmap;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapNodoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapSeccionEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapConexionRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapNodoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapSeccionRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Slice vertical de referencia (RF-CUR-01/02) — el patrón que el resto del equipo puede
 * calcar para las demás épicas del contrato (path/06-contrato-api.md). Ver
 * {@link SeccionService} / {@link NodoService} / {@link ConexionService} para el resto
 * del CRUD del grafo, que sigue este mismo patrón.
 *
 * <p>Nota de arquitectura: ver {@code domain.port.package-info} sobre por qué esta capa
 * habla directo con el repositorio de Spring Data en vez de pasar por un puerto.
 */
@Service
@RequiredArgsConstructor
public class RoadmapService {

    private final RoadmapRepository roadmapRepository;
    private final RoadmapSeccionRepository seccionRepository;
    private final RoadmapNodoRepository nodoRepository;
    private final RoadmapConexionRepository conexionRepository;
    private final GuardaCursoArchivado guardaCursoArchivado;

    @Transactional
    public RoadmapEntity crear(UUID cursoCohorteId) {
        roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId)
            .ifPresent(existing -> {
                throw new RoadmapYaExisteException(cursoCohorteId);
            });

        RoadmapEntity roadmap = new RoadmapEntity();
        roadmap.setCursoCohorteId(cursoCohorteId);
        return roadmapRepository.save(roadmap);
    }

    @Transactional(readOnly = true)
    public RoadmapEntity obtenerPorCursoCohorte(UUID cursoCohorteId) {
        return requerir(cursoCohorteId);
    }

    /**
     * PUT /roadmaps/{cc} — cambia el estado (borrador ↔ publicado). RF-CUR-05: un curso
     * publicado sigue siendo editable, así que no hay transición prohibida acá.
     */
    @Transactional
    public RoadmapEntity actualizarEstado(UUID cursoCohorteId, EstadoRoadmap nuevoEstado) {
        guardaCursoArchivado.exigirNoArchivado(cursoCohorteId);
        RoadmapEntity roadmap = requerir(cursoCohorteId);
        roadmap.setEstado(nuevoEstado);
        return roadmapRepository.save(roadmap);
    }

    /** GET /roadmaps/{cc} — grafo completo para el editor (secciones + nodos + conexiones). */
    @Transactional(readOnly = true)
    public GrafoRoadmap obtenerGrafo(UUID cursoCohorteId) {
        RoadmapEntity roadmap = requerir(cursoCohorteId);

        List<RoadmapSeccionEntity> secciones =
            seccionRepository.findByRoadmapIdAndActivoTrueOrderByOrdenAsc(roadmap.getId());
        List<UUID> seccionIds = secciones.stream().map(RoadmapSeccionEntity::getId).toList();

        List<RoadmapNodoEntity> nodos = seccionIds.isEmpty()
            ? List.of()
            : nodoRepository.findBySeccionIdInAndActivoTrue(seccionIds);

        return new GrafoRoadmap(
            roadmap, secciones, nodos,
            conexionRepository.findByRoadmapIdAndActivoTrue(roadmap.getId())
        );
    }

    private RoadmapEntity requerir(UUID cursoCohorteId) {
        return roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId)
            .orElseThrow(() -> new RoadmapNoEncontradoException(cursoCohorteId));
    }
}
