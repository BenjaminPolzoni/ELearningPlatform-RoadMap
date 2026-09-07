package ar.utn.frc.tup.roadmap.application.usecase;

import ar.utn.frc.tup.roadmap.domain.exception.RoadmapNoEncontradoException;
import ar.utn.frc.tup.roadmap.domain.exception.RoadmapYaExisteException;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Slice vertical de referencia (RF-CUR-01/02) — el patrón que el resto del equipo puede
 * calcar para las demás épicas del contrato (path/06-contrato-api.md).
 *
 * <p>Nota de arquitectura: ver {@code domain.port.package-info} sobre por qué esta capa
 * habla directo con el repositorio de Spring Data en vez de pasar por un puerto.
 */
@Service
@RequiredArgsConstructor
public class RoadmapService {

    private final RoadmapRepository roadmapRepository;

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
        return roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId)
            .orElseThrow(() -> new RoadmapNoEncontradoException(cursoCohorteId));
    }
}
