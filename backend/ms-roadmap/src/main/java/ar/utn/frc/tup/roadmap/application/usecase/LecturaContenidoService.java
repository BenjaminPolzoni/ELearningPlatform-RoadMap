package ar.utn.frc.tup.roadmap.application.usecase;

import ar.utn.frc.tup.roadmap.domain.exception.LecturaContenidoNoPermitidaException;
import ar.utn.frc.tup.roadmap.domain.exception.LecturaContenidoNoAutorizadaException;
import ar.utn.frc.tup.roadmap.domain.exception.NodoNoEncontradoException;
import ar.utn.frc.tup.roadmap.domain.exception.RoadmapNoEncontradoException;
import ar.utn.frc.tup.roadmap.domain.exception.SeccionNoEncontradaException;
import ar.utn.frc.tup.roadmap.domain.model.EstadoNodo;
import ar.utn.frc.tup.roadmap.domain.model.TipoNodo;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.LecturaContenidoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.ProgresoNodoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapNodoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapSeccionEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.LecturaContenidoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.ProgresoNodoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapNodoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapSeccionRepository;
import ar.utn.frc.tup.roadmap.infrastructure.rest.dto.AvanceLecturaUnidadResponse;
import ar.utn.frc.tup.roadmap.infrastructure.rest.dto.LecturaContenidoResponse;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LecturaContenidoService {

    private static final List<TipoNodo> TIPOS_CONTENIDO = List.of(TipoNodo.TEORIA, TipoNodo.CONTENIDO);

    private final RoadmapRepository roadmapRepository;
    private final RoadmapSeccionRepository seccionRepository;
    private final RoadmapNodoRepository nodoRepository;
    private final ProgresoNodoRepository progresoRepository;
    private final LecturaContenidoRepository lecturaRepository;
    private final GuardaCursoArchivado guardaCursoArchivado;

    @Transactional
    public LecturaContenidoResponse marcarLeido(UUID alumnoId, UUID cursoCohorteId, UUID nodoId) {
        if (alumnoId == null) {
            throw new LecturaContenidoNoPermitidaException("Falta X-User-Id");
        }
        guardaCursoArchivado.exigirNoArchivado(cursoCohorteId);
        RoadmapEntity roadmap = roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId)
            .orElseThrow(() -> new RoadmapNoEncontradoException(cursoCohorteId));
        RoadmapNodoEntity nodo = nodoRepository.findByIdAndActivoTrue(nodoId)
            .orElseThrow(() -> new NodoNoEncontradoException(nodoId));
        validarPertenencia(nodo, roadmap.getId());
        if (!TIPOS_CONTENIDO.contains(nodo.getTipo())) {
            throw new LecturaContenidoNoPermitidaException("El nodo no es contenido teórico");
        }

        // El cache de cohorte no contiene el padrón por alumno; la fila de progreso
        // vigente es la evidencia local de matrícula y, además, del desbloqueo.
        ProgresoNodoEntity progreso = progresoRepository.findByAlumnoIdAndNodoId(alumnoId, nodoId)
            .filter(p -> p.getCursoCohorteId().equals(cursoCohorteId))
            .orElseThrow(() -> new LecturaContenidoNoAutorizadaException(
                "La unidad no está desbloqueada para el alumno"
            ));
        if (progreso.getEstado() == EstadoNodo.BLOQUEADO) {
            throw new LecturaContenidoNoAutorizadaException(
                "La unidad no está desbloqueada para el alumno"
            );
        }

        LecturaContenidoEntity existente = lecturaRepository
            .findByAlumnoIdAndCursoCohorteIdAndNodoId(alumnoId, cursoCohorteId, nodoId)
            .orElse(null);
        if (existente != null) {
            return respuesta(existente, false);
        }

        LecturaContenidoEntity lectura = new LecturaContenidoEntity();
        lectura.setAlumnoId(alumnoId);
        lectura.setCursoCohorteId(cursoCohorteId);
        lectura.setNodoId(nodoId);
        return respuesta(lecturaRepository.save(lectura), true);
    }

    @Transactional(readOnly = true)
    public AvanceLecturaUnidadResponse avanceUnidad(
        UUID alumnoId, UUID cursoCohorteId, UUID unidadId
    ) {
        if (alumnoId == null) {
            throw new LecturaContenidoNoPermitidaException("Falta X-User-Id");
        }
        RoadmapEntity roadmap = roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId)
            .orElseThrow(() -> new RoadmapNoEncontradoException(cursoCohorteId));
        RoadmapSeccionEntity unidad = seccionRepository.findByIdAndActivoTrue(unidadId)
            .orElseThrow(() -> new SeccionNoEncontradaException(unidadId));
        if (!unidad.getRoadmapId().equals(roadmap.getId())) {
            throw new SeccionNoEncontradaException(unidadId);
        }
        List<RoadmapNodoEntity> contenidos =
            nodoRepository.findBySeccionIdAndActivoTrueAndTipoIn(unidadId, TIPOS_CONTENIDO)
                .stream().filter(RoadmapNodoEntity::isEsObligatorio).toList();
        List<UUID> ids = contenidos.stream().map(RoadmapNodoEntity::getId).toList();
        int leidos = ids.isEmpty() ? 0 : lecturaRepository
            .findByAlumnoIdAndCursoCohorteIdAndNodoIdIn(alumnoId, cursoCohorteId, ids).size();
        int total = ids.size();
        int porcentaje = total == 0 ? 100 : (int) Math.round(100.0 * leidos / total);
        return new AvanceLecturaUnidadResponse(unidadId, total, leidos, porcentaje);
    }

    private void validarPertenencia(RoadmapNodoEntity nodo, UUID roadmapId) {
        RoadmapSeccionEntity seccion = seccionRepository.findByIdAndActivoTrue(nodo.getSeccionId())
            .orElseThrow(() -> new NodoNoEncontradoException(nodo.getId()));
        if (!seccion.getRoadmapId().equals(roadmapId)) {
            throw new NodoNoEncontradoException(nodo.getId());
        }
    }

    private LecturaContenidoResponse respuesta(LecturaContenidoEntity lectura, boolean nueva) {
        return new LecturaContenidoResponse(
            lectura.getAlumnoId(), lectura.getCursoCohorteId(), lectura.getNodoId(),
            lectura.getRegistradoEn(), nueva
        );
    }
}
