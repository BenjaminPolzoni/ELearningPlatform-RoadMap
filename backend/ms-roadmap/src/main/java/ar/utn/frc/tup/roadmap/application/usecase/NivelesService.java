package ar.utn.frc.tup.roadmap.application.usecase;

import ar.utn.frc.tup.roadmap.domain.exception.RoadmapNoEncontradoException;
import ar.utn.frc.tup.roadmap.domain.model.Nivel;
import ar.utn.frc.tup.roadmap.domain.service.CurvaNiveles;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.NivelDefinicionEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.NivelDefinicionRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Curva de niveles del curso (contrato §3, RF-NIV-03/04/05, RF-CFG-05). Mientras el profesor
 * no defina una curva propia, el curso corre con la por defecto del sistema (PAR-09) y no se
 * persiste nada. La regla de la curva vive en {@link CurvaNiveles} (dominio puro); este
 * service solo orquesta persistencia + guardas, calcando el patrón de {@link SeccionService}.
 */
@Service
@RequiredArgsConstructor
public class NivelesService {

    private final RoadmapRepository roadmapRepository;
    private final NivelDefinicionRepository nivelRepository;
    private final GuardaCursoArchivado guardaCursoArchivado;

    @Transactional(readOnly = true)
    public CurvaNiveles curvaVigente(UUID cursoCohorteId) {
        requerirRoadmap(cursoCohorteId);
        List<NivelDefinicionEntity> filas =
            nivelRepository.findByCursoCohorteIdAndActivoTrueOrderByOrdenAsc(cursoCohorteId);
        if (filas.isEmpty()) {
            return CurvaNiveles.par09();
        }
        return CurvaNiveles.de(filas.stream()
            .map(f -> new CurvaNiveles.Definicion(f.getNombre(), f.getUmbralXp()))
            .toList());
    }

    /**
     * RF-CFG-05: el profesor define el set de niveles de su curso. Reemplaza el anterior —
     * baja lógica de las filas vigentes (RF-NFR-01) e inserta la curva nueva. Valida
     * RF-NIV-04 <b>antes</b> de tocar la base.
     */
    @Transactional
    public CurvaNiveles definirCurva(UUID cursoCohorteId, List<CurvaNiveles.Definicion> definiciones) {
        guardaCursoArchivado.exigirNoArchivado(cursoCohorteId);
        requerirRoadmap(cursoCohorteId);

        CurvaNiveles curva = CurvaNiveles.de(definiciones);

        List<NivelDefinicionEntity> vigentes =
            nivelRepository.findByCursoCohorteIdAndActivoTrueOrderByOrdenAsc(cursoCohorteId);
        vigentes.forEach(NivelDefinicionEntity::darDeBaja);
        nivelRepository.saveAll(vigentes);

        for (Nivel n : curva.niveles()) {
            NivelDefinicionEntity fila = new NivelDefinicionEntity();
            fila.setCursoCohorteId(cursoCohorteId);
            fila.setNombre(n.nombre());
            fila.setUmbralXp(n.umbralXp());
            fila.setOrden(n.orden());
            nivelRepository.save(fila);
        }
        return curva;
    }

    private void requerirRoadmap(UUID cursoCohorteId) {
        roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId)
            .orElseThrow(() -> new RoadmapNoEncontradoException(cursoCohorteId));
    }
}
