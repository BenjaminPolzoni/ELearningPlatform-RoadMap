package ar.utn.frc.tup.roadmap.application.usecase;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.EventoProcesadoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapSeccionEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.EventoProcesadoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapSeccionRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Bootstrapping de {@code ProgresoNodo} — mitad "el alumno arranca el curso" de README §6.8.
 * Al inscribirse un alumno (evento de Cursos, T02), se habilitan las raíces de la primera
 * sección del roadmap para ese alumno. Idempotente vía patrón Inbox.
 *
 * <p>Si el roadmap o la primera sección todavía no existen (inscripción antes de que el
 * profesor arme el curso), no es un error: se marca el evento como visto y listo — cuando
 * el profesor cree la sección, el desbloqueo inicial habrá que dispararlo de otra forma
 * (queda como límite conocido, ver README §6.8).
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ProcesarAlumnoInscriptoUseCase {

    private final EventoProcesadoRepository eventoProcesadoRepository;
    private final RoadmapRepository roadmapRepository;
    private final RoadmapSeccionRepository seccionRepository;
    private final EvaluarDesbloqueoService evaluarDesbloqueoService;

    public void procesar(UUID eventoId, UUID alumnoId, UUID cursoCohorteId) {
        if (eventoProcesadoRepository.existsById(eventoId)) {
            log.info("Evento {} ya procesado, se ignora (reintento del bus)", eventoId);
            return;
        }

        RoadmapEntity roadmap = roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId).orElse(null);
        RoadmapSeccionEntity primera = roadmap == null ? null
            : seccionRepository.findByRoadmapIdAndActivoTrueOrderByOrdenAsc(roadmap.getId())
                .stream().findFirst().orElse(null);

        if (primera == null) {
            log.warn("Inscripción de alumno {} en curso {} sin roadmap/sección todavía — nada que habilitar",
                alumnoId, cursoCohorteId);
        } else {
            evaluarDesbloqueoService.habilitarRaicesDeSeccion(alumnoId, cursoCohorteId, primera.getId());
        }

        EventoProcesadoEntity marca = new EventoProcesadoEntity();
        marca.setOrigenEventoId(eventoId);
        eventoProcesadoRepository.save(marca);
    }
}
