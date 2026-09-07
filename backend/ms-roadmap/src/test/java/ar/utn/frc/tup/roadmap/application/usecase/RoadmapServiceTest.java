package ar.utn.frc.tup.roadmap.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ar.utn.frc.tup.roadmap.domain.exception.RoadmapNoEncontradoException;
import ar.utn.frc.tup.roadmap.domain.exception.RoadmapYaExisteException;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Unitario puro, sin contexto de Spring — RoadmapService no toca infraestructura acá,
 * el repositorio es un mock. Este es el patrón esperado para los MOTORES de la Fase 2
 * (path/06-contrato-api.md §8: "testeables sin levantar Spring").
 */
@ExtendWith(MockitoExtension.class)
class RoadmapServiceTest {

    @Mock
    private RoadmapRepository roadmapRepository;

    private RoadmapService service;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        service = new RoadmapService(roadmapRepository);
    }

    @Test
    void crear_persisteUnRoadmapNuevoEnBorrador_cuandoNoExisteUnoActivo() {
        UUID cursoCohorteId = UUID.randomUUID();
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId))
            .thenReturn(Optional.empty());
        when(roadmapRepository.save(any(RoadmapEntity.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        RoadmapEntity resultado = service.crear(cursoCohorteId);

        assertThat(resultado.getCursoCohorteId()).isEqualTo(cursoCohorteId);
        verify(roadmapRepository).save(any(RoadmapEntity.class));
    }

    @Test
    void crear_lanzaConflicto_cuandoYaExisteUnRoadmapActivoParaEseCurso() {
        UUID cursoCohorteId = UUID.randomUUID();
        RoadmapEntity existente = new RoadmapEntity();
        existente.setCursoCohorteId(cursoCohorteId);
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId))
            .thenReturn(Optional.of(existente));

        assertThatThrownBy(() -> service.crear(cursoCohorteId))
            .isInstanceOf(RoadmapYaExisteException.class);
    }

    @Test
    void obtenerPorCursoCohorte_lanzaNoEncontrado_cuandoNoHayRoadmapActivo() {
        UUID cursoCohorteId = UUID.randomUUID();
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId))
            .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.obtenerPorCursoCohorte(cursoCohorteId))
            .isInstanceOf(RoadmapNoEncontradoException.class);
    }
}
