package ar.utn.frc.tup.roadmap.application.usecase;

import ar.utn.frc.tup.roadmap.domain.exception.NodoInvalidoException;
import ar.utn.frc.tup.roadmap.domain.exception.NodoNoEncontradoException;
import ar.utn.frc.tup.roadmap.domain.exception.RoadmapNoEncontradoException;
import ar.utn.frc.tup.roadmap.domain.exception.SeccionNoEncontradaException;
import ar.utn.frc.tup.roadmap.domain.model.TipoNodo;
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
 * CRUD de la "actividad" / nodo (contrato §1). Roadmap solo ubica y conecta el nodo;
 * el contenido del desafío es del Motor de Desafíos (T03) y se referencia por
 * {@code desafioId} (RF-CUR-04).
 */
@Service
@RequiredArgsConstructor
public class NodoService {

    private final RoadmapRepository roadmapRepository;
    private final RoadmapSeccionRepository seccionRepository;
    private final RoadmapNodoRepository nodoRepository;
    private final RoadmapConexionRepository conexionRepository;
    private final GuardaCursoArchivado guardaCursoArchivado;

    @Transactional
    public RoadmapNodoEntity crear(
        UUID cursoCohorteId, UUID seccionId, TipoNodo tipo, UUID desafioId,
        double posicionX, double posicionY, boolean esObligatorio, int reintentosPermitidos
    ) {
        guardaCursoArchivado.exigirNoArchivado(cursoCohorteId);
        RoadmapEntity roadmap = requerirRoadmap(cursoCohorteId);
        requerirSeccionEnRoadmap(seccionId, roadmap.getId());
        validarCoherencia(tipo, desafioId);

        RoadmapNodoEntity nodo = new RoadmapNodoEntity();
        nodo.setSeccionId(seccionId);
        aplicar(nodo, tipo, desafioId, posicionX, posicionY, esObligatorio, reintentosPermitidos);
        return nodoRepository.save(nodo);
    }

    @Transactional
    public RoadmapNodoEntity actualizar(
        UUID cursoCohorteId, UUID nodoId, UUID seccionId, TipoNodo tipo, UUID desafioId,
        double posicionX, double posicionY, boolean esObligatorio, int reintentosPermitidos
    ) {
        guardaCursoArchivado.exigirNoArchivado(cursoCohorteId);
        RoadmapEntity roadmap = requerirRoadmap(cursoCohorteId);
        RoadmapNodoEntity nodo = requerirNodoEnRoadmap(nodoId, roadmap.getId());
        // La sección destino (puede ser la misma o una mudanza a otra unidad) también
        // tiene que ser de este roadmap.
        requerirSeccionEnRoadmap(seccionId, roadmap.getId());
        validarCoherencia(tipo, desafioId);

        nodo.setSeccionId(seccionId);
        aplicar(nodo, tipo, desafioId, posicionX, posicionY, esObligatorio, reintentosPermitidos);
        return nodoRepository.save(nodo);
    }

    /**
     * Baja lógica del nodo y de toda conexión activa que lo tenga de origen o destino
     * (RF-NFR-01). Una arista sin uno de sus extremos no tiene sentido.
     */
    @Transactional
    public void eliminar(UUID cursoCohorteId, UUID nodoId) {
        guardaCursoArchivado.exigirNoArchivado(cursoCohorteId);
        RoadmapEntity roadmap = requerirRoadmap(cursoCohorteId);
        RoadmapNodoEntity nodo = requerirNodoEnRoadmap(nodoId, roadmap.getId());

        List<RoadmapConexionEntity> conexiones = conexionRepository.findActivasQueTocan(List.of(nodoId));
        conexiones.forEach(RoadmapConexionEntity::darDeBaja);
        conexionRepository.saveAll(conexiones);

        nodo.darDeBaja();
        nodoRepository.save(nodo);
    }

    private void aplicar(
        RoadmapNodoEntity nodo, TipoNodo tipo, UUID desafioId,
        double posicionX, double posicionY, boolean esObligatorio, int reintentosPermitidos
    ) {
        nodo.setTipo(tipo);
        nodo.setDesafioId(tipo == TipoNodo.HITO ? null : desafioId);
        nodo.setPosicionX(posicionX);
        nodo.setPosicionY(posicionY);
        nodo.setEsObligatorio(esObligatorio);
        nodo.setReintentosPermitidos(reintentosPermitidos);
    }

    private void validarCoherencia(TipoNodo tipo, UUID desafioId) {
        if (tipo == TipoNodo.HITO && desafioId != null) {
            throw new NodoInvalidoException(
                "Un nodo HITO es un marcador sin evaluación: no puede llevar desafioId");
        }
    }

    private RoadmapEntity requerirRoadmap(UUID cursoCohorteId) {
        return roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId)
            .orElseThrow(() -> new RoadmapNoEncontradoException(cursoCohorteId));
    }

    private RoadmapSeccionEntity requerirSeccionEnRoadmap(UUID seccionId, UUID roadmapId) {
        RoadmapSeccionEntity seccion = seccionRepository.findByIdAndActivoTrue(seccionId)
            .orElseThrow(() -> new SeccionNoEncontradaException(seccionId));
        if (!seccion.getRoadmapId().equals(roadmapId)) {
            throw new SeccionNoEncontradaException(seccionId);
        }
        return seccion;
    }

    private RoadmapNodoEntity requerirNodoEnRoadmap(UUID nodoId, UUID roadmapId) {
        RoadmapNodoEntity nodo = nodoRepository.findByIdAndActivoTrue(nodoId)
            .orElseThrow(() -> new NodoNoEncontradoException(nodoId));
        RoadmapSeccionEntity seccion = seccionRepository.findByIdAndActivoTrue(nodo.getSeccionId())
            .orElseThrow(() -> new NodoNoEncontradoException(nodoId));
        if (!seccion.getRoadmapId().equals(roadmapId)) {
            throw new NodoNoEncontradoException(nodoId);
        }
        return nodo;
    }
}
