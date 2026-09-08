package ar.utn.frc.tup.roadmap.application.usecase;

import ar.utn.frc.tup.roadmap.domain.exception.ConexionInvalidaException;
import ar.utn.frc.tup.roadmap.domain.exception.ConexionNoEncontradaException;
import ar.utn.frc.tup.roadmap.domain.exception.ConexionYaExisteException;
import ar.utn.frc.tup.roadmap.domain.exception.NodoNoEncontradoException;
import ar.utn.frc.tup.roadmap.domain.exception.RoadmapNoEncontradoException;
import ar.utn.frc.tup.roadmap.domain.exception.SeccionNoEncontradaException;
import ar.utn.frc.tup.roadmap.domain.service.DetectorCiclos;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapConexionEntity;
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
 * Alta y baja de conexiones (prerequisitos) del grafo (contrato §1). Además del CRUD,
 * es el punto donde se defiende la invariante de "grafo de prerequisitos = DAG":
 * sin auto-lazos, sin duplicados, sin ciclos ({@link DetectorCiclos}).
 */
@Service
@RequiredArgsConstructor
public class ConexionService {

    private final RoadmapRepository roadmapRepository;
    private final RoadmapSeccionRepository seccionRepository;
    private final RoadmapNodoRepository nodoRepository;
    private final RoadmapConexionRepository conexionRepository;
    private final DetectorCiclos detectorCiclos;

    @Transactional
    public RoadmapConexionEntity crear(UUID cursoCohorteId, UUID nodoOrigenId, UUID nodoDestinoId) {
        RoadmapEntity roadmap = requerirRoadmap(cursoCohorteId);

        if (nodoOrigenId.equals(nodoDestinoId)) {
            throw new ConexionInvalidaException("Un nodo no puede ser prerequisito de sí mismo");
        }
        requerirNodoEnRoadmap(nodoOrigenId, roadmap.getId());
        requerirNodoEnRoadmap(nodoDestinoId, roadmap.getId());

        conexionRepository.findByNodoOrigenIdAndNodoDestinoIdAndActivoTrue(nodoOrigenId, nodoDestinoId)
            .ifPresent(c -> {
                throw new ConexionYaExisteException(nodoOrigenId, nodoDestinoId);
            });

        boolean creariaCiclo = detectorCiclos.creariaCiclo(
            nodoOrigenId, nodoDestinoId,
            nodoId -> conexionRepository.findByNodoOrigenIdAndActivoTrue(nodoId).stream()
                .map(RoadmapConexionEntity::getNodoDestinoId).toList()
        );
        if (creariaCiclo) {
            throw new ConexionInvalidaException(
                "La conexión " + nodoOrigenId + " -> " + nodoDestinoId
                    + " cerraría un ciclo de prerequisitos");
        }

        RoadmapConexionEntity conexion = new RoadmapConexionEntity();
        conexion.setRoadmapId(roadmap.getId());
        conexion.setNodoOrigenId(nodoOrigenId);
        conexion.setNodoDestinoId(nodoDestinoId);
        return conexionRepository.save(conexion);
    }

    @Transactional
    public void eliminar(UUID cursoCohorteId, UUID conexionId) {
        RoadmapEntity roadmap = requerirRoadmap(cursoCohorteId);
        RoadmapConexionEntity conexion = conexionRepository.findByIdAndActivoTrue(conexionId)
            .orElseThrow(() -> new ConexionNoEncontradaException(conexionId));
        if (!conexion.getRoadmapId().equals(roadmap.getId())) {
            throw new ConexionNoEncontradaException(conexionId);
        }
        conexion.darDeBaja();
        conexionRepository.save(conexion);
    }

    @Transactional(readOnly = true)
    public List<RoadmapConexionEntity> listar(UUID cursoCohorteId) {
        RoadmapEntity roadmap = requerirRoadmap(cursoCohorteId);
        return conexionRepository.findByRoadmapIdAndActivoTrue(roadmap.getId());
    }

    private RoadmapEntity requerirRoadmap(UUID cursoCohorteId) {
        return roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId)
            .orElseThrow(() -> new RoadmapNoEncontradoException(cursoCohorteId));
    }

    private void requerirNodoEnRoadmap(UUID nodoId, UUID roadmapId) {
        RoadmapNodoEntity nodo = nodoRepository.findByIdAndActivoTrue(nodoId)
            .orElseThrow(() -> new NodoNoEncontradoException(nodoId));
        RoadmapSeccionEntity seccion = seccionRepository.findByIdAndActivoTrue(nodo.getSeccionId())
            .orElseThrow(() -> new NodoNoEncontradoException(nodoId));
        if (!seccion.getRoadmapId().equals(roadmapId)) {
            throw new ConexionInvalidaException("El nodo " + nodoId + " no pertenece a este roadmap");
        }
    }
}
