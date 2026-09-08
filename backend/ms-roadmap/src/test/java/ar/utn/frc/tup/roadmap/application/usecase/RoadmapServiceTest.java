package ar.utn.frc.tup.roadmap.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ar.utn.frc.tup.roadmap.domain.exception.RoadmapNoEncontradoException;
import ar.utn.frc.tup.roadmap.domain.exception.RoadmapYaExisteException;
import ar.utn.frc.tup.roadmap.domain.model.EstadoRoadmap;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapNodoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapSeccionEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapConexionRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapNodoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapSeccionRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Unitario puro, sin contexto de Spring — RoadmapService no toca infraestructura acá,
 * los repositorios son mocks. Este es el patrón esperado para todo el CRUD del grafo
 * (path/06-contrato-api.md §8: "testeables sin levantar Spring").
 */
@ExtendWith(MockitoExtension.class)
class RoadmapServiceTest {

    @Mock private RoadmapRepository roadmapRepository;
    @Mock private RoadmapSeccionRepository seccionRepository;
    @Mock private RoadmapNodoRepository nodoRepository;
    @Mock private RoadmapConexionRepository conexionRepository;

    @org.mockito.Mock private ar.utn.frc.tup.roadmap.application.usecase.GuardaCursoArchivado guardaCursoArchivado;

    private RoadmapService service;

    @BeforeEach
    void setUp() {
        service = new RoadmapService(roadmapRepository, seccionRepository, nodoRepository, conexionRepository, guardaCursoArchivado);
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

    @Test
    void actualizarEstado_cambiaAPublicado_yPersiste() {
        UUID cursoCohorteId = UUID.randomUUID();
        RoadmapEntity roadmap = new RoadmapEntity();
        roadmap.setCursoCohorteId(cursoCohorteId);
        roadmap.setEstado(EstadoRoadmap.BORRADOR);
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId))
            .thenReturn(Optional.of(roadmap));
        when(roadmapRepository.save(any(RoadmapEntity.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        RoadmapEntity resultado = service.actualizarEstado(cursoCohorteId, EstadoRoadmap.PUBLICADO);

        assertThat(resultado.getEstado()).isEqualTo(EstadoRoadmap.PUBLICADO);
        verify(roadmapRepository).save(roadmap);
    }

    @Test
    void obtenerGrafo_devuelveSeccionesNodosYConexiones_delRoadmapDelCurso() {
        UUID cursoCohorteId = UUID.randomUUID();
        RoadmapEntity roadmap = new RoadmapEntity();
        roadmap.setCursoCohorteId(cursoCohorteId);
        UUID roadmapId = UUID.randomUUID();
        roadmap.setId(roadmapId);

        RoadmapSeccionEntity seccion = new RoadmapSeccionEntity();
        seccion.setRoadmapId(roadmapId);
        UUID seccionId = UUID.randomUUID();
        seccion.setId(seccionId);
        RoadmapNodoEntity nodo = new RoadmapNodoEntity();
        nodo.setSeccionId(seccionId);

        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId))
            .thenReturn(Optional.of(roadmap));
        when(seccionRepository.findByRoadmapIdAndActivoTrueOrderByOrdenAsc(roadmapId))
            .thenReturn(List.of(seccion));
        when(nodoRepository.findBySeccionIdInAndActivoTrue(anyList()))
            .thenReturn(List.of(nodo));
        when(conexionRepository.findByRoadmapIdAndActivoTrue(roadmapId))
            .thenReturn(List.of());

        GrafoRoadmap grafo = service.obtenerGrafo(cursoCohorteId);

        assertThat(grafo.roadmap()).isSameAs(roadmap);
        assertThat(grafo.seccionesOrdenadas()).containsExactly(seccion);
        assertThat(grafo.nodos()).containsExactly(nodo);
        assertThat(grafo.conexiones()).isEmpty();
    }

    @Test
    void obtenerGrafo_noConsultaNodos_cuandoElRoadmapNoTieneSecciones() {
        UUID cursoCohorteId = UUID.randomUUID();
        RoadmapEntity roadmap = new RoadmapEntity();
        UUID roadmapId = UUID.randomUUID();
        roadmap.setId(roadmapId);

        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId))
            .thenReturn(Optional.of(roadmap));
        when(seccionRepository.findByRoadmapIdAndActivoTrueOrderByOrdenAsc(roadmapId))
            .thenReturn(List.of());
        when(conexionRepository.findByRoadmapIdAndActivoTrue(roadmapId))
            .thenReturn(List.of());

        GrafoRoadmap grafo = service.obtenerGrafo(cursoCohorteId);

        assertThat(grafo.nodos()).isEmpty();
    }
}
