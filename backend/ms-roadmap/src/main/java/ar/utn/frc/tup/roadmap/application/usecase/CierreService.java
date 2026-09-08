package ar.utn.frc.tup.roadmap.application.usecase;

import ar.utn.frc.tup.roadmap.domain.exception.RoadmapNoEncontradoException;
import ar.utn.frc.tup.roadmap.domain.model.EstadoAcademico;
import ar.utn.frc.tup.roadmap.domain.model.PosicionRanking;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.EstadoAcademicoFinalEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.EstadoAcademicoFinalRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapRepository;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cierre académico del curso — contrato §4 (RF-RNK-10/13, RF-CUR-08b). Roadmap NO archiva
 * el curso: solo confirma el estado final de cada alumno y responde la precondición
 * síncrona que Cursos (T02) consulta antes de archivar.
 *
 * <p>El estado final lo decide el PROFESOR a mano; acá solo se le <b>sugiere</b> uno a
 * partir del ranking (RF-RNK-05/06) y se persiste lo que confirma.
 */
@Service
@RequiredArgsConstructor
public class CierreService {

    private final RoadmapRepository roadmapRepository;
    private final EstadoAcademicoFinalRepository estadoFinalRepository;
    private final RankingService rankingService;
    private final GuardaCursoArchivado guardaCursoArchivado;

    /** RF-RNK-10: la pantalla de confirmación — cada alumno con su situación y lo ya confirmado. */
    @Transactional(readOnly = true)
    public List<CandidatoCierre> candidatos(UUID cursoCohorteId) {
        exigirRoadmap(cursoCohorteId);
        Map<UUID, EstadoAcademico> confirmados = estadoFinalRepository.findByCursoCohorteId(cursoCohorteId).stream()
            .collect(Collectors.toMap(EstadoAcademicoFinalEntity::getAlumnoId, EstadoAcademicoFinalEntity::getEstado));

        return rankingService.rankingCompleto(cursoCohorteId).stream()
            .map(p -> new CandidatoCierre(
                p.alumnoId(), p.xpTotal(), p.zona(), p.candidatoPromocion(), p.riesgoRegularidad(),
                sugerir(p), confirmados.get(p.alumnoId())
            ))
            .toList();
    }

    /** RF-RNK-10: persiste (upsert) el estado que el PROFESOR confirma para cada alumno. */
    @Transactional
    public void confirmar(UUID cursoCohorteId, List<ItemConfirmacion> items, UUID confirmadoPor) {
        exigirRoadmap(cursoCohorteId);
        guardaCursoArchivado.exigirNoArchivado(cursoCohorteId);
        Instant ahora = Instant.now();
        for (ItemConfirmacion item : items) {
            EstadoAcademicoFinalEntity fila = estadoFinalRepository
                .findByAlumnoIdAndCursoCohorteId(item.alumnoId(), cursoCohorteId)
                .orElseGet(() -> {
                    EstadoAcademicoFinalEntity nueva = new EstadoAcademicoFinalEntity();
                    nueva.setAlumnoId(item.alumnoId());
                    nueva.setCursoCohorteId(cursoCohorteId);
                    return nueva;
                });
            fila.setEstado(item.estado());
            fila.setConfirmadoPor(confirmadoPor);
            fila.setConfirmadoEn(ahora);
            estadoFinalRepository.save(fila);
        }
    }

    /** RF-RNK-13: legajo y nombre NO son nuestros — los agrega el BFF sobre este dato crudo. */
    @Transactional(readOnly = true)
    public List<FilaReporte> reporte(UUID cursoCohorteId) {
        exigirRoadmap(cursoCohorteId);
        Map<UUID, EstadoAcademico> confirmados = estadoFinalRepository.findByCursoCohorteId(cursoCohorteId).stream()
            .collect(Collectors.toMap(EstadoAcademicoFinalEntity::getAlumnoId, EstadoAcademicoFinalEntity::getEstado));

        return rankingService.rankingCompleto(cursoCohorteId).stream()
            .map(p -> new FilaReporte(
                p.alumnoId(), confirmados.get(p.alumnoId()), p.xpTotal(), p.insigniasCount()
            ))
            .toList();
    }

    /**
     * RF-CUR-08b: precondición síncrona que consulta Cursos antes de archivar. Hoy el
     * único bloqueo chequeado es "falta confirmar el estado de algún alumno". Los gates
     * por encuesta de cierre (RF-ENC-11) y por scores de IA diferidos (RF-IA-34) dependen
     * de servicios que todavía no consultamos — anotados en deuda-tecnica/.
     */
    @Transactional(readOnly = true)
    public EstadoCierre estadoParaArchivar(UUID cursoCohorteId) {
        exigirRoadmap(cursoCohorteId);
        var confirmados = estadoFinalRepository.findByCursoCohorteId(cursoCohorteId).stream()
            .map(EstadoAcademicoFinalEntity::getAlumnoId).collect(Collectors.toSet());

        List<UUID> sinConfirmar = rankingService.rankingCompleto(cursoCohorteId).stream()
            .map(PosicionRanking::alumnoId)
            .filter(id -> !confirmados.contains(id))
            .toList();

        return new EstadoCierre(sinConfirmar.isEmpty(), sinConfirmar);
    }

    private void exigirRoadmap(UUID cursoCohorteId) {
        if (roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId).isEmpty()) {
            throw new RoadmapNoEncontradoException(cursoCohorteId);
        }
    }

    /** Sugerencia, no decisión: P90+0 vidas+100% obligatorios → PROMOCIONADO; el resto REGULAR
     *  (el riesgo de regularidad se muestra aparte con su flag). NO_REGULAR / ABANDONO solo a mano. */
    private static EstadoAcademico sugerir(PosicionRanking p) {
        return p.candidatoPromocion() ? EstadoAcademico.PROMOCIONADO : EstadoAcademico.REGULAR;
    }

    public record CandidatoCierre(
        UUID alumnoId, int xpTotal,
        ar.utn.frc.tup.roadmap.domain.model.Zona zona,
        boolean candidatoPromocion, boolean riesgoRegularidad,
        EstadoAcademico estadoSugerido, EstadoAcademico estadoConfirmado
    ) {}

    public record ItemConfirmacion(UUID alumnoId, EstadoAcademico estado) {}

    public record FilaReporte(UUID alumnoId, EstadoAcademico estadoFinal, int xpTotal, long insigniasCount) {}

    public record EstadoCierre(boolean listoParaArchivar, List<UUID> alumnosSinConfirmar) {}
}
