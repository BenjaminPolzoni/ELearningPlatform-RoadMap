package ar.utn.frc.tup.roadmap.application.usecase;

import ar.utn.frc.tup.roadmap.domain.exception.CursoArchivadoException;
import ar.utn.frc.tup.roadmap.domain.model.EstadoCursoCohorte;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.CursoCohorteContextoRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Guard compartido del "modo lectura" tras archivar un curso (Camino 6, RF-CUR-09).
 * Lo consultan todas las escrituras del grafo y del cierre antes de mutar — resuelve la
 * deuda anotada en deuda-tecnica/tarea-deuda-06-contrato-api.md #6.
 */
@Component
@RequiredArgsConstructor
public class GuardaCursoArchivado {

    private final CursoCohorteContextoRepository contextoRepository;

    /** Lanza {@link CursoArchivadoException} (409) si el curso está archivado. */
    public void exigirNoArchivado(UUID cursoCohorteId) {
        contextoRepository.findByCursoCohorteId(cursoCohorteId)
            .filter(c -> c.getEstado() == EstadoCursoCohorte.ARCHIVADO)
            .ifPresent(c -> {
                throw new CursoArchivadoException(cursoCohorteId);
            });
    }
}
