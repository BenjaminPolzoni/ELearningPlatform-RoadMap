package ar.utn.frc.tup.roadmap.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import ar.utn.frc.tup.roadmap.application.usecase.RankingService.VistaRankingAlumno;
import ar.utn.frc.tup.roadmap.domain.model.PosicionRanking;
import ar.utn.frc.tup.roadmap.domain.model.TipoMovimientoVida;
import ar.utn.frc.tup.roadmap.domain.service.CalculadoraRanking;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.ConteoPorAlumno;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.CursoCohorteContextoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.InsigniaOtorgadaRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.MovimientoVidaRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.MovimientoXpRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.ProgresoNodoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapNodoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RankingServiceTest {

    @Mock private RoadmapRepository roadmapRepository;
    @Mock private RoadmapNodoRepository nodoRepository;
    @Mock private ProgresoNodoRepository progresoRepository;
    @Mock private MovimientoXpRepository movimientoXpRepository;
    @Mock private MovimientoVidaRepository movimientoVidaRepository;
    @Mock private InsigniaOtorgadaRepository insigniaRepository;
    @Mock private CursoCohorteContextoRepository contextoRepository;

    private RankingService service;

    private final UUID cc = UUID.randomUUID();
    private final UUID roadmapId = UUID.randomUUID();
    private final UUID alumnoA = UUID.randomUUID();
    private final UUID alumnoB = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new RankingService(
            roadmapRepository, nodoRepository, progresoRepository, movimientoXpRepository,
            movimientoVidaRepository, insigniaRepository, contextoRepository, new CalculadoraRanking()
        );
        RoadmapEntity roadmap = new RoadmapEntity();
        roadmap.setId(roadmapId);
        roadmap.setCursoCohorteId(cc);
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cc)).thenReturn(Optional.of(roadmap));
        when(movimientoXpRepository.sumarXpPorAlumno(cc)).thenReturn(List.of(conteo(alumnoA, 300), conteo(alumnoB, 100)));
        lenient().when(insigniaRepository.contarPorAlumno(cc)).thenReturn(List.of());
        lenient().when(movimientoVidaRepository.contarPorTipoPorAlumno(cc, TipoMovimientoVida.PERDIDA))
            .thenReturn(List.of());
        lenient().when(progresoRepository.findByCursoCohorteIdAndActivoTrue(cc)).thenReturn(List.of());
        lenient().when(nodoRepository.findIdsObligatoriosDeRoadmap(roadmapId)).thenReturn(List.of());
        lenient().when(contextoRepository.findByCursoCohorteId(cc)).thenReturn(Optional.empty());
    }

    @Test
    void rankingCompleto_ordenaPorXp_yTraeLosDosAlumnos() {
        List<PosicionRanking> r = service.rankingCompleto(cc);

        assertThat(r).extracting(PosicionRanking::alumnoId).containsExactly(alumnoA, alumnoB);
        assertThat(r.get(0).xpTotal()).isEqualTo(300);
    }

    @Test
    void vistaAlumno_dejaSuFilaConId_yAnonimizaLasAjenas() {
        VistaRankingAlumno vista = service.vistaAlumno(cc, alumnoB);

        assertThat(vista.miFila().alumnoId()).isEqualTo(alumnoB);
        assertThat(vista.top3()).anySatisfy(p -> assertThat(p.alumnoId()).isEqualTo(alumnoB));
        assertThat(vista.top3()).filteredOn(p -> p.alumnoId() == null).isNotEmpty();
        // la fila de A aparece en top3 pero sin identificar
        assertThat(vista.top3()).noneMatch(p -> alumnoA.equals(p.alumnoId()));
    }

    private static ConteoPorAlumno conteo(UUID alumnoId, long total) {
        return new ConteoPorAlumno() {
            @Override public UUID getAlumnoId() { return alumnoId; }
            @Override public long getTotal() { return total; }
        };
    }
}
