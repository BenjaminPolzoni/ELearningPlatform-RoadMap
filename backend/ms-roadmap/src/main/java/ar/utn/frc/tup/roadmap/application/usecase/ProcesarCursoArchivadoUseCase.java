package ar.utn.frc.tup.roadmap.application.usecase;

import ar.utn.frc.tup.roadmap.domain.model.EstadoCursoCohorte;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.CursoCohorteContextoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.EventoProcesadoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.CursoCohorteContextoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.EventoProcesadoRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Camino 6 del BPMN: al llegar {@code CursoArchivadoEvent} de Cursos (T02), se marca el
 * curso como {@code ARCHIVADO} en el cache {@code CursoCohorteContexto}. A partir de ahí
 * {@link GuardaCursoArchivado} congela toda escritura del grafo y del cierre — Roadmap y
 * Ranking quedan en modo lectura (RF-CUR-09).
 *
 * <p>Idempotente vía el mismo patrón Inbox que los otros consumidores.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ProcesarCursoArchivadoUseCase {

    private final EventoProcesadoRepository eventoProcesadoRepository;
    private final CursoCohorteContextoRepository contextoRepository;

    public void procesar(UUID eventoId, UUID cursoCohorteId, Integer inscriptosActivos) {
        if (eventoProcesadoRepository.existsById(eventoId)) {
            log.info("Evento {} ya procesado, se ignora (reintento del bus)", eventoId);
            return;
        }

        CursoCohorteContextoEntity contexto = contextoRepository.findByCursoCohorteId(cursoCohorteId)
            .orElseGet(() -> {
                CursoCohorteContextoEntity nuevo = new CursoCohorteContextoEntity();
                nuevo.setCursoCohorteId(cursoCohorteId);
                return nuevo;
            });
        contexto.setEstado(EstadoCursoCohorte.ARCHIVADO);
        if (inscriptosActivos != null) {
            contexto.setInscriptosActivos(inscriptosActivos);
        }
        contextoRepository.save(contexto);
        log.info("Curso {} marcado ARCHIVADO — Roadmap y Ranking pasan a modo lectura", cursoCohorteId);

        EventoProcesadoEntity marca = new EventoProcesadoEntity();
        marca.setOrigenEventoId(eventoId);
        eventoProcesadoRepository.save(marca);
    }
}
