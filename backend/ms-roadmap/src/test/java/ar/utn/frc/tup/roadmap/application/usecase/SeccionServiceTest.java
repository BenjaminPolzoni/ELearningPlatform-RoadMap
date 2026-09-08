package ar.utn.frc.tup.roadmap.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ar.utn.frc.tup.roadmap.domain.exception.RoadmapNoEncontradoException;
import ar.utn.frc.tup.roadmap.domain.exception.SeccionNoEncontradaException;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapConexionEntity;
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

@ExtendWith(MockitoExtension.class)
class SeccionServiceTest {

    @Mock private RoadmapRepository roadmapRepository;
    @Mock private RoadmapSeccionRepository seccionRepository;
    @Mock private RoadmapNodoRepository nodoRepository;
    @Mock private RoadmapConexionRepository conexionRepository;

    @org.mockito.Mock private ar.utn.frc.tup.roadmap.application.usecase.GuardaCursoArchivado guardaCursoArchivado;

    private SeccionService service;

    private final UUID cursoCohorteId = UUID.randomUUID();
    private final UUID roadmapId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new SeccionService(roadmapRepository, seccionRepository, nodoRepository, conexionRepository, guardaCursoArchivado);
    }

    private RoadmapEntity roadmapActivo() {
        RoadmapEntity r = new RoadmapEntity();
        r.setId(roadmapId);
        r.setCursoCohorteId(cursoCohorteId);
        return r;
    }

    @Test
    void crear_cuelgaLaSeccionDelRoadmapDelCurso() {
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId))
            .thenReturn(Optional.of(roadmapActivo()));
        when(seccionRepository.save(any(RoadmapSeccionEntity.class)))
            .thenAnswer(i -> i.getArgument(0));

        RoadmapSeccionEntity creada = service.crear(cursoCohorteId, "Unidad 1", 500, 1);

        assertThat(creada.getRoadmapId()).isEqualTo(roadmapId);
        assertThat(creada.getNombre()).isEqualTo("Unidad 1");
        assertThat(creada.getUmbralXpDesbloqueo()).isEqualTo(500);
        assertThat(creada.getOrden()).isEqualTo(1);
    }

    @Test
    void crear_lanzaNoEncontrado_cuandoNoHayRoadmapParaEseCurso() {
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId))
            .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.crear(cursoCohorteId, "x", 0, 0))
            .isInstanceOf(RoadmapNoEncontradoException.class);
        verify(seccionRepository, never()).save(any());
    }

    @Test
    void actualizar_lanzaNoEncontrado_cuandoLaSeccionEsDeOtroRoadmap() {
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId))
            .thenReturn(Optional.of(roadmapActivo()));
        RoadmapSeccionEntity ajena = new RoadmapSeccionEntity();
        ajena.setRoadmapId(UUID.randomUUID()); // otro roadmap
        UUID seccionId = UUID.randomUUID();
        when(seccionRepository.findByIdAndActivoTrue(seccionId)).thenReturn(Optional.of(ajena));

        assertThatThrownBy(() -> service.actualizar(cursoCohorteId, seccionId, "x", 0, 0))
            .isInstanceOf(SeccionNoEncontradaException.class);
    }

    @Test
    void eliminar_daDeBajaEnCascadaNodosYConexiones_ademasDeLaSeccion() {
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId))
            .thenReturn(Optional.of(roadmapActivo()));
        UUID seccionId = UUID.randomUUID();
        RoadmapSeccionEntity seccion = new RoadmapSeccionEntity();
        seccion.setId(seccionId);
        seccion.setRoadmapId(roadmapId);
        when(seccionRepository.findByIdAndActivoTrue(seccionId)).thenReturn(Optional.of(seccion));

        RoadmapNodoEntity nodo = new RoadmapNodoEntity();
        nodo.setId(UUID.randomUUID());
        nodo.setSeccionId(seccionId);
        when(nodoRepository.findBySeccionIdAndActivoTrue(seccionId)).thenReturn(List.of(nodo));

        RoadmapConexionEntity conexion = new RoadmapConexionEntity();
        conexion.setId(UUID.randomUUID());
        when(conexionRepository.findActivasQueTocan(anyList())).thenReturn(List.of(conexion));

        service.eliminar(cursoCohorteId, seccionId);

        assertThat(seccion.isActivo()).isFalse();
        assertThat(nodo.isActivo()).isFalse();
        assertThat(conexion.isActivo()).isFalse();
        verify(seccionRepository).save(seccion);
        verify(nodoRepository).saveAll(List.of(nodo));
        verify(conexionRepository).saveAll(List.of(conexion));
    }

    @Test
    void eliminar_noTocaConexiones_cuandoLaSeccionNoTieneNodos() {
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId))
            .thenReturn(Optional.of(roadmapActivo()));
        UUID seccionId = UUID.randomUUID();
        RoadmapSeccionEntity seccion = new RoadmapSeccionEntity();
        seccion.setId(seccionId);
        seccion.setRoadmapId(roadmapId);
        when(seccionRepository.findByIdAndActivoTrue(seccionId)).thenReturn(Optional.of(seccion));
        when(nodoRepository.findBySeccionIdAndActivoTrue(seccionId)).thenReturn(List.of());

        service.eliminar(cursoCohorteId, seccionId);

        assertThat(seccion.isActivo()).isFalse();
        verify(conexionRepository, never()).findActivasQueTocan(anyList());
    }
}
