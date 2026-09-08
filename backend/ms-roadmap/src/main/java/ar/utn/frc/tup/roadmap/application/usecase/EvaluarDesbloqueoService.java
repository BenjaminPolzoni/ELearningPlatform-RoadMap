package ar.utn.frc.tup.roadmap.application.usecase;

import ar.utn.frc.tup.roadmap.domain.model.EstadoNodo;
import ar.utn.frc.tup.roadmap.domain.service.MotorDesbloqueo;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.ProgresoNodoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapConexionEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapNodoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapSeccionEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.MovimientoXpRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.ProgresoNodoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapConexionRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapNodoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapSeccionRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Responde la duda de bootstrapping de path/README.md §6.8: esta clase ES quien crea
 * las primeras filas de {@code ProgresoNodo} en {@code HABILITADO} — no existe un paso
 * de "inscripción" aparte que las precargue. Un nodo se habilita en uno de dos momentos:
 *
 * <ol>
 *   <li><b>Sucesor directo</b> (dentro de la misma sección): al completar un nodo, sus
 *       sucesores por {@code RoadmapConexion} se evalúan — se habilitan solo si TODOS
 *       sus prerequisitos (puede haber más de uno, nodo de fusión) están completados.</li>
 *   <li><b>Raíz de la sección siguiente</b>: al superar el umbral de XP acumulado en la
 *       sección actual (RF-CUR-06), se habilitan los nodos sin ninguna conexión entrante
 *       de la sección que sigue en orden.</li>
 * </ol>
 *
 * <p>Es un servicio de aplicación, no un motor de dominio: coordina repositorios (JPA)
 * con {@link MotorDesbloqueo} (dominio puro). Se llama después de completar un nodo con
 * éxito — ver {@code ProcesarDesafioCompletadoUseCase}.
 */
@Service
@RequiredArgsConstructor
public class EvaluarDesbloqueoService {

    private final RoadmapNodoRepository nodoRepository;
    private final RoadmapConexionRepository conexionRepository;
    private final RoadmapSeccionRepository seccionRepository;
    private final ProgresoNodoRepository progresoRepository;
    private final MovimientoXpRepository movimientoXpRepository;
    private final MotorDesbloqueo motorDesbloqueo;

    public void evaluarTrasCompletar(UUID alumnoId, UUID cursoCohorteId, RoadmapNodoEntity nodoCompletado) {
        habilitarSucesoresDirectos(alumnoId, cursoCohorteId, nodoCompletado.getId());
        habilitarSiguienteSeccionSiCorresponde(alumnoId, cursoCohorteId, nodoCompletado.getSeccionId());
    }

    /**
     * Bootstrapping — la otra mitad de la duda de README §6.8: cuando un alumno <b>arranca
     * el curso</b>, la primera sección no tiene una sección anterior de la cual acumular XP,
     * así que nada dispara el desbloqueo de sus nodos raíz. Lo dispara la inscripción
     * (evento de Cursos, T02): esta operación habilita las raíces de esa sección para ese
     * alumno. Reusa exactamente la misma lógica que el desbloqueo por umbral.
     */
    public void habilitarRaicesDeSeccion(UUID alumnoId, UUID cursoCohorteId, UUID seccionId) {
        for (RoadmapNodoEntity raiz : nodoRepository.findNodosRaizDeSeccion(seccionId)) {
            habilitarSiEstaBloqueado(alumnoId, cursoCohorteId, raiz.getId());
        }
    }

    private void habilitarSucesoresDirectos(UUID alumnoId, UUID cursoCohorteId, UUID nodoCompletadoId) {
        List<RoadmapConexionEntity> salientes = conexionRepository.findByNodoOrigenIdAndActivoTrue(nodoCompletadoId);

        for (RoadmapConexionEntity conexion : salientes) {
            UUID candidatoId = conexion.getNodoDestinoId();

            List<UUID> prerequisitoIds = conexionRepository.findByNodoDestinoIdAndActivoTrue(candidatoId)
                .stream().map(RoadmapConexionEntity::getNodoOrigenId).toList();

            List<ProgresoNodoEntity> progresosPrerequisitos =
                progresoRepository.findByAlumnoIdAndNodoIdIn(alumnoId, prerequisitoIds);

            // Si falta la fila de progreso de ALGÚN prerequisito, ese prerequisito no
            // está completado — no alcanza con contar solo las filas que sí existen.
            if (progresosPrerequisitos.size() != prerequisitoIds.size()) {
                continue;
            }

            List<EstadoNodo> estados = progresosPrerequisitos.stream()
                .map(ProgresoNodoEntity::getEstado).toList();

            if (motorDesbloqueo.todosLosPrerequisitosCumplidos(estados)) {
                habilitarSiEstaBloqueado(alumnoId, cursoCohorteId, candidatoId);
            }
        }
    }

    private void habilitarSiguienteSeccionSiCorresponde(UUID alumnoId, UUID cursoCohorteId, UUID seccionActualId) {
        RoadmapSeccionEntity seccionActual = seccionRepository.findById(seccionActualId)
            .orElseThrow(() -> new IllegalStateException("Sección " + seccionActualId + " no encontrada"));

        RoadmapSeccionEntity siguiente = seccionRepository
            .findFirstByRoadmapIdAndOrdenGreaterThanAndActivoTrueOrderByOrdenAsc(
                seccionActual.getRoadmapId(), seccionActual.getOrden()
            )
            .orElse(null);

        if (siguiente == null) {
            return; // última sección del roadmap — nada que desbloquear
        }

        List<UUID> nodoIdsSeccionActual = nodoRepository.findBySeccionIdAndActivoTrue(seccionActualId)
            .stream().map(RoadmapNodoEntity::getId).toList();
        int xpAcumulado = movimientoXpRepository.sumarMontoPorAlumnoYNodos(alumnoId, nodoIdsSeccionActual);

        if (motorDesbloqueo.debeDesbloquear(xpAcumulado, siguiente.getUmbralXpDesbloqueo())) {
            for (RoadmapNodoEntity raiz : nodoRepository.findNodosRaizDeSeccion(siguiente.getId())) {
                habilitarSiEstaBloqueado(alumnoId, cursoCohorteId, raiz.getId());
            }
        }
    }

    /** Idempotente: si ya existe progreso más allá de BLOQUEADO, no lo toca. */
    private void habilitarSiEstaBloqueado(UUID alumnoId, UUID cursoCohorteId, UUID nodoId) {
        ProgresoNodoEntity progreso = progresoRepository.findByAlumnoIdAndNodoId(alumnoId, nodoId)
            .orElseGet(() -> {
                ProgresoNodoEntity nuevo = new ProgresoNodoEntity();
                nuevo.setAlumnoId(alumnoId);
                nuevo.setCursoCohorteId(cursoCohorteId);
                nuevo.setNodoId(nodoId);
                return nuevo;
            });

        if (progreso.getEstado() == EstadoNodo.BLOQUEADO) {
            progreso.setEstado(progreso.getEstado().alHabilitar());
            progresoRepository.save(progreso);
        }
    }
}
