package ar.utn.frc.tup.roadmap.application.usecase;

import ar.utn.frc.tup.roadmap.domain.exception.RoadmapNoEncontradoException;
import ar.utn.frc.tup.roadmap.domain.model.EstadoNodo;
import ar.utn.frc.tup.roadmap.domain.model.InsumoAlumnoRanking;
import ar.utn.frc.tup.roadmap.domain.model.PosicionRanking;
import ar.utn.frc.tup.roadmap.domain.model.TipoMovimientoVida;
import ar.utn.frc.tup.roadmap.domain.model.Zona;
import ar.utn.frc.tup.roadmap.domain.service.CalculadoraRanking;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.ProgresoNodoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.ConteoPorAlumno;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.CursoCohorteContextoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.InsigniaOtorgadaRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.MovimientoVidaRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.MovimientoXpRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.ProgresoNodoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapNodoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * RF-RNK-01/03/05/06/09/11. Calcula el ranking <b>en caliente</b> a partir de las tablas
 * base en cada request — el modelo (02-modelo-de-datos.md §3, nota final de V1) deja
 * explícito que {@code RankingEntrada} no es tabla todavía y que la materialización
 * (MATERIALIZED VIEW vs. recálculo por evento) es decisión de Fase 3.
 *
 * <p>Este service solo ORQUESTA: la lógica de orden/percentil/zona vive en
 * {@link CalculadoraRanking} (dominio puro, testeable sin Spring).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RankingService {

    private final RoadmapRepository roadmapRepository;
    private final RoadmapNodoRepository nodoRepository;
    private final ProgresoNodoRepository progresoRepository;
    private final MovimientoXpRepository movimientoXpRepository;
    private final MovimientoVidaRepository movimientoVidaRepository;
    private final InsigniaOtorgadaRepository insigniaRepository;
    private final CursoCohorteContextoRepository contextoRepository;
    private final CalculadoraRanking calculadoraRanking;

    /** Vista completa (PROFESOR): la tabla entera, ordenada. */
    @Transactional(readOnly = true)
    public List<PosicionRanking> rankingCompleto(UUID cursoCohorteId) {
        RoadmapEntity roadmap = roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId)
            .orElseThrow(() -> new RoadmapNoEncontradoException(cursoCohorteId));

        List<InsumoAlumnoRanking> insumos = armarInsumos(roadmap);
        return calculadoraRanking.calcular(insumos, inscriptosActivos(cursoCohorteId, insumos.size()));
    }

    /**
     * Vista del ALUMNO (RF-RNK-03/07): su fila completa + top 3 + bottom 3 + los cortes
     * P90/P10, todo con las filas ajenas <b>sin identificar</b> ({@code alumnoId = null}).
     */
    @Transactional(readOnly = true)
    public VistaRankingAlumno vistaAlumno(UUID cursoCohorteId, UUID alumnoId) {
        List<PosicionRanking> completo = rankingCompleto(cursoCohorteId);

        PosicionRanking miFila = completo.stream()
            .filter(p -> p.alumnoId().equals(alumnoId))
            .findFirst()
            .orElse(null);

        int n = completo.size();
        List<PosicionRanking> top3 = completo.stream().limit(3).map(p -> anonimizarSalvo(p, alumnoId)).toList();
        List<PosicionRanking> bottom3 = completo.stream().skip(Math.max(0, n - 3))
            .map(p -> anonimizarSalvo(p, alumnoId)).toList();

        Integer corteP90 = corte(completo, Zona.P90, true);
        Integer corteP10 = corte(completo, Zona.P10, false);

        return new VistaRankingAlumno(miFila, top3, bottom3, corteP90, corteP10);
    }

    /** Candidatos a promoción (RF-RNK-05) y en riesgo de regularidad (RF-RNK-06). */
    @Transactional(readOnly = true)
    public CandidatosRanking candidatos(UUID cursoCohorteId) {
        List<PosicionRanking> completo = rankingCompleto(cursoCohorteId);
        return new CandidatosRanking(
            completo.stream().filter(PosicionRanking::candidatoPromocion).toList(),
            completo.stream().filter(PosicionRanking::riesgoRegularidad).toList()
        );
    }

    // ── armado de insumos ────────────────────────────────────────────────

    private List<InsumoAlumnoRanking> armarInsumos(RoadmapEntity roadmap) {
        UUID cc = roadmap.getCursoCohorteId();

        Map<UUID, Long> xpPorAlumno = aMapa(movimientoXpRepository.sumarXpPorAlumno(cc));
        Map<UUID, Long> insigniasPorAlumno = aMapa(insigniaRepository.contarPorAlumno(cc));
        Map<UUID, Long> perdidasPorAlumno =
            aMapa(movimientoVidaRepository.contarPorTipoPorAlumno(cc, TipoMovimientoVida.PERDIDA));

        List<ProgresoNodoEntity> progreso = progresoRepository.findByCursoCohorteIdAndActivoTrue(cc);
        Set<UUID> obligatorios = new HashSet<>(nodoRepository.findIdsObligatoriosDeRoadmap(roadmap.getId()));

        Map<UUID, List<ProgresoNodoEntity>> progresoPorAlumno = progreso.stream()
            .collect(Collectors.groupingBy(ProgresoNodoEntity::getAlumnoId));

        // Universo de alumnos del ranking: cualquiera con XP o con progreso en el curso.
        Set<UUID> alumnos = new HashSet<>(xpPorAlumno.keySet());
        alumnos.addAll(progresoPorAlumno.keySet());

        List<InsumoAlumnoRanking> insumos = new ArrayList<>(alumnos.size());
        for (UUID alumnoId : alumnos) {
            List<ProgresoNodoEntity> suProgreso = progresoPorAlumno.getOrDefault(alumnoId, List.of());
            long completados = suProgreso.stream()
                .filter(p -> p.getEstado() == EstadoNodo.COMPLETADO).count();
            long obligatoriosOk = suProgreso.stream()
                .filter(p -> p.getEstado() == EstadoNodo.COMPLETADO && obligatorios.contains(p.getNodoId()))
                .count();
            int pctObligatorios = obligatorios.isEmpty()
                ? 100
                : (int) Math.round(100.0 * obligatoriosOk / obligatorios.size());

            insumos.add(new InsumoAlumnoRanking(
                alumnoId,
                Math.toIntExact(xpPorAlumno.getOrDefault(alumnoId, 0L)),
                insigniasPorAlumno.getOrDefault(alumnoId, 0L),
                Math.toIntExact(perdidasPorAlumno.getOrDefault(alumnoId, 0L)),
                (int) completados,
                pctObligatorios
            ));
        }
        return insumos;
    }

    /**
     * Inscriptos activos del curso (RF-RNK-09: percentiles solo con ≥ 10). Sale del cache
     * {@code CursoCohorteContexto} que alimenta Cursos (T02). Si el cache no está o marca 0
     * — todavía nadie emite ese dato — se cae al nº de alumnos con actividad y se loguea la
     * degradación (RF-NFR-04). ponytail: fallback simple; el valor real llega con la sync
     * a Cursos (deuda-tecnica/tarea-deuda-06-contrato-api.md).
     */
    private int inscriptosActivos(UUID cursoCohorteId, int alumnosConActividad) {
        return contextoRepository.findByCursoCohorteId(cursoCohorteId)
            .map(c -> c.getInscriptosActivos())
            .filter(v -> v > 0)
            .orElseGet(() -> {
                log.warn("Sin inscriptos_activos de Cursos para {} — se usa el nº de alumnos con actividad ({})",
                    cursoCohorteId, alumnosConActividad);
                return alumnosConActividad;
            });
    }

    private static Map<UUID, Long> aMapa(List<ConteoPorAlumno> filas) {
        return filas.stream().collect(Collectors.toMap(ConteoPorAlumno::getAlumnoId, ConteoPorAlumno::getTotal));
    }

    private static PosicionRanking anonimizarSalvo(PosicionRanking p, UUID alumnoId) {
        if (p.alumnoId().equals(alumnoId)) {
            return p;
        }
        return new PosicionRanking(
            null, p.xpTotal(), p.posicion(), p.percentil(), p.zona(), p.insigniasCount(),
            p.vidasPerdidasHistorico(), p.ejerciciosCompletados(), p.candidatoPromocion(), p.riesgoRegularidad()
        );
    }

    /** XP en el borde de la zona: el peor de P90 (extremoAlto=true) o el mejor de P10. */
    private static Integer corte(List<PosicionRanking> ranking, Zona zona, boolean extremoAlto) {
        List<PosicionRanking> enZona = ranking.stream().filter(p -> p.zona() == zona).toList();
        if (enZona.isEmpty()) {
            return null;
        }
        Function<PosicionRanking, Integer> xp = PosicionRanking::xpTotal;
        return extremoAlto
            ? enZona.stream().map(xp).min(Integer::compareTo).orElseThrow()
            : enZona.stream().map(xp).max(Integer::compareTo).orElseThrow();
    }

    public record VistaRankingAlumno(
        PosicionRanking miFila,
        List<PosicionRanking> top3,
        List<PosicionRanking> bottom3,
        Integer corteXpP90,
        Integer corteXpP10
    ) {}

    public record CandidatosRanking(
        List<PosicionRanking> promocion,
        List<PosicionRanking> riesgoRegularidad
    ) {}
}
