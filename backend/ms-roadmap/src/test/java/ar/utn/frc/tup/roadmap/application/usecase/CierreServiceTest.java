package ar.utn.frc.tup.roadmap.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ar.utn.frc.tup.roadmap.application.usecase.CierreService.EstadoCierre;
import ar.utn.frc.tup.roadmap.application.usecase.CierreService.ItemConfirmacion;
import ar.utn.frc.tup.roadmap.domain.exception.RoadmapNoEncontradoException;
import ar.utn.frc.tup.roadmap.domain.model.EstadoAcademico;
import ar.utn.frc.tup.roadmap.domain.model.PosicionRanking;
import ar.utn.frc.tup.roadmap.domain.model.Zona;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.EstadoAcademicoFinalEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.EstadoAcademicoFinalRepository;
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
class CierreServiceTest {

    @Mock private RoadmapRepository roadmapRepository;
    @Mock private EstadoAcademicoFinalRepository estadoFinalRepository;
    @Mock private RankingService rankingService;

    private CierreService service;

    private final UUID cc = UUID.randomUUID();
    private final UUID alumnoA = UUID.randomUUID();
    private final UUID alumnoB = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new CierreService(roadmapRepository, estadoFinalRepository, rankingService);
        lenient().when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cc))
            .thenReturn(Optional.of(new RoadmapEntity()));
    }

    private PosicionRanking fila(UUID alumnoId, boolean promocion) {
        return new PosicionRanking(alumnoId, 500, 1, 95.0, Zona.P90, 3, 0, 8, promocion, false);
    }

    @Test
    void candidatos_sugiereEstado_yMarcaLoYaConfirmado() {
        when(rankingService.rankingCompleto(cc)).thenReturn(List.of(fila(alumnoA, true), fila(alumnoB, false)));
        EstadoAcademicoFinalEntity confirmadoA = new EstadoAcademicoFinalEntity();
        confirmadoA.setAlumnoId(alumnoA);
        confirmadoA.setEstado(EstadoAcademico.PROMOCIONADO);
        when(estadoFinalRepository.findByCursoCohorteId(cc)).thenReturn(List.of(confirmadoA));

        var candidatos = service.candidatos(cc);

        assertThat(candidatos).hasSize(2);
        assertThat(candidatos.get(0).estadoSugerido()).isEqualTo(EstadoAcademico.PROMOCIONADO);
        assertThat(candidatos.get(0).estadoConfirmado()).isEqualTo(EstadoAcademico.PROMOCIONADO);
        assertThat(candidatos.get(1).estadoSugerido()).isEqualTo(EstadoAcademico.REGULAR);
        assertThat(candidatos.get(1).estadoConfirmado()).isNull();
    }

    @Test
    void confirmar_upsert_creaFilaNuevaCuandoNoExiste() {
        when(estadoFinalRepository.findByAlumnoIdAndCursoCohorteId(alumnoA, cc)).thenReturn(Optional.empty());
        when(estadoFinalRepository.save(any(EstadoAcademicoFinalEntity.class))).thenAnswer(i -> i.getArgument(0));
        UUID profe = UUID.randomUUID();

        service.confirmar(cc, List.of(new ItemConfirmacion(alumnoA, EstadoAcademico.REGULAR)), profe);

        verify(estadoFinalRepository).save(any(EstadoAcademicoFinalEntity.class));
    }

    @Test
    void estadoParaArchivar_falseYListaLosPendientes_cuandoFaltaConfirmarAlguno() {
        when(rankingService.rankingCompleto(cc)).thenReturn(List.of(fila(alumnoA, true), fila(alumnoB, false)));
        EstadoAcademicoFinalEntity confirmadoA = new EstadoAcademicoFinalEntity();
        confirmadoA.setAlumnoId(alumnoA);
        when(estadoFinalRepository.findByCursoCohorteId(cc)).thenReturn(List.of(confirmadoA));

        EstadoCierre estado = service.estadoParaArchivar(cc);

        assertThat(estado.listoParaArchivar()).isFalse();
        assertThat(estado.alumnosSinConfirmar()).containsExactly(alumnoB);
    }

    @Test
    void estadoParaArchivar_true_cuandoTodosConfirmados() {
        when(rankingService.rankingCompleto(cc)).thenReturn(List.of(fila(alumnoA, true)));
        EstadoAcademicoFinalEntity confirmadoA = new EstadoAcademicoFinalEntity();
        confirmadoA.setAlumnoId(alumnoA);
        when(estadoFinalRepository.findByCursoCohorteId(cc)).thenReturn(List.of(confirmadoA));

        assertThat(service.estadoParaArchivar(cc).listoParaArchivar()).isTrue();
    }

    @Test
    void lanzaNoEncontrado_cuandoNoHayRoadmap() {
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cc)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.candidatos(cc)).isInstanceOf(RoadmapNoEncontradoException.class);
    }
}
