package ar.utn.frc.tup.roadmap.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ar.utn.frc.tup.roadmap.domain.exception.ConexionInvalidaException;
import ar.utn.frc.tup.roadmap.domain.exception.ConexionNoEncontradaException;
import ar.utn.frc.tup.roadmap.domain.exception.ConexionYaExisteException;
import ar.utn.frc.tup.roadmap.domain.service.DetectorCiclos;
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
class ConexionServiceTest {

    @Mock private RoadmapRepository roadmapRepository;
    @Mock private RoadmapSeccionRepository seccionRepository;
    @Mock private RoadmapNodoRepository nodoRepository;
    @Mock private RoadmapConexionRepository conexionRepository;

    @org.mockito.Mock private ar.utn.frc.tup.roadmap.application.usecase.GuardaCursoArchivado guardaCursoArchivado;

    private ConexionService service;

    private final UUID cursoCohorteId = UUID.randomUUID();
    private final UUID roadmapId = UUID.randomUUID();
    private final UUID seccionId = UUID.randomUUID();
    private final UUID nodoA = UUID.randomUUID();
    private final UUID nodoB = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new ConexionService(roadmapRepository, seccionRepository, nodoRepository, conexionRepository, new DetectorCiclos(), guardaCursoArchivado);
    }

    private void roadmapConDosNodos() {
        RoadmapEntity roadmap = new RoadmapEntity();
        roadmap.setId(roadmapId);
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId))
            .thenReturn(Optional.of(roadmap));

        RoadmapSeccionEntity seccion = new RoadmapSeccionEntity();
        seccion.setId(seccionId);
        seccion.setRoadmapId(roadmapId);
        lenient().when(seccionRepository.findByIdAndActivoTrue(seccionId))
            .thenReturn(Optional.of(seccion));

        for (UUID nodoId : List.of(nodoA, nodoB)) {
            RoadmapNodoEntity nodo = new RoadmapNodoEntity();
            nodo.setId(nodoId);
            nodo.setSeccionId(seccionId);
            lenient().when(nodoRepository.findByIdAndActivoTrue(nodoId)).thenReturn(Optional.of(nodo));
        }
    }

    @Test
    void crear_persisteLaConexion_cuandoElGrafoQuedaBienFormado() {
        roadmapConDosNodos();
        when(conexionRepository.findByNodoOrigenIdAndNodoDestinoIdAndActivoTrue(nodoA, nodoB))
            .thenReturn(Optional.empty());
        when(conexionRepository.findByNodoOrigenIdAndActivoTrue(nodoB)).thenReturn(List.of());
        when(conexionRepository.save(any(RoadmapConexionEntity.class))).thenAnswer(i -> i.getArgument(0));

        RoadmapConexionEntity creada = service.crear(cursoCohorteId, nodoA, nodoB);

        assertThat(creada.getRoadmapId()).isEqualTo(roadmapId);
        assertThat(creada.getNodoOrigenId()).isEqualTo(nodoA);
        assertThat(creada.getNodoDestinoId()).isEqualTo(nodoB);
    }

    @Test
    void crear_rechazaAutoLazo() {
        RoadmapEntity roadmap = new RoadmapEntity();
        roadmap.setId(roadmapId);
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId))
            .thenReturn(Optional.of(roadmap));

        assertThatThrownBy(() -> service.crear(cursoCohorteId, nodoA, nodoA))
            .isInstanceOf(ConexionInvalidaException.class);
        verify(conexionRepository, never()).save(any());
    }

    @Test
    void crear_rechazaDuplicado() {
        roadmapConDosNodos();
        when(conexionRepository.findByNodoOrigenIdAndNodoDestinoIdAndActivoTrue(nodoA, nodoB))
            .thenReturn(Optional.of(new RoadmapConexionEntity()));

        assertThatThrownBy(() -> service.crear(cursoCohorteId, nodoA, nodoB))
            .isInstanceOf(ConexionYaExisteException.class);
    }

    @Test
    void crear_rechazaAristaQueCerrariaUnCiclo() {
        roadmapConDosNodos();
        when(conexionRepository.findByNodoOrigenIdAndNodoDestinoIdAndActivoTrue(nodoB, nodoA))
            .thenReturn(Optional.empty());
        // Ya existe A -> B; agregar B -> A cerraría el ciclo.
        RoadmapConexionEntity aHaciaB = new RoadmapConexionEntity();
        aHaciaB.setNodoOrigenId(nodoA);
        aHaciaB.setNodoDestinoId(nodoB);
        when(conexionRepository.findByNodoOrigenIdAndActivoTrue(nodoA)).thenReturn(List.of(aHaciaB));

        assertThatThrownBy(() -> service.crear(cursoCohorteId, nodoB, nodoA))
            .isInstanceOf(ConexionInvalidaException.class);
        verify(conexionRepository, never()).save(any());
    }

    @Test
    void crear_rechazaNodoDeOtroRoadmap() {
        RoadmapEntity roadmap = new RoadmapEntity();
        roadmap.setId(roadmapId);
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId))
            .thenReturn(Optional.of(roadmap));

        RoadmapNodoEntity propio = new RoadmapNodoEntity();
        propio.setId(nodoA);
        propio.setSeccionId(seccionId);
        when(nodoRepository.findByIdAndActivoTrue(nodoA)).thenReturn(Optional.of(propio));
        RoadmapSeccionEntity seccionPropia = new RoadmapSeccionEntity();
        seccionPropia.setId(seccionId);
        seccionPropia.setRoadmapId(roadmapId);
        when(seccionRepository.findByIdAndActivoTrue(seccionId)).thenReturn(Optional.of(seccionPropia));

        RoadmapNodoEntity ajeno = new RoadmapNodoEntity();
        ajeno.setId(nodoB);
        UUID seccionAjenaId = UUID.randomUUID();
        ajeno.setSeccionId(seccionAjenaId);
        when(nodoRepository.findByIdAndActivoTrue(nodoB)).thenReturn(Optional.of(ajeno));
        RoadmapSeccionEntity seccionAjena = new RoadmapSeccionEntity();
        seccionAjena.setRoadmapId(UUID.randomUUID());
        when(seccionRepository.findByIdAndActivoTrue(seccionAjenaId)).thenReturn(Optional.of(seccionAjena));

        assertThatThrownBy(() -> service.crear(cursoCohorteId, nodoA, nodoB))
            .isInstanceOf(ConexionInvalidaException.class);
    }

    @Test
    void eliminar_lanzaNoEncontrada_cuandoLaConexionEsDeOtroRoadmap() {
        RoadmapEntity roadmap = new RoadmapEntity();
        roadmap.setId(roadmapId);
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId))
            .thenReturn(Optional.of(roadmap));
        UUID conexionId = UUID.randomUUID();
        RoadmapConexionEntity ajena = new RoadmapConexionEntity();
        ajena.setRoadmapId(UUID.randomUUID());
        when(conexionRepository.findByIdAndActivoTrue(conexionId)).thenReturn(Optional.of(ajena));

        assertThatThrownBy(() -> service.eliminar(cursoCohorteId, conexionId))
            .isInstanceOf(ConexionNoEncontradaException.class);
    }

    @Test
    void eliminar_daDeBajaLogica() {
        RoadmapEntity roadmap = new RoadmapEntity();
        roadmap.setId(roadmapId);
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId))
            .thenReturn(Optional.of(roadmap));
        UUID conexionId = UUID.randomUUID();
        RoadmapConexionEntity conexion = new RoadmapConexionEntity();
        conexion.setId(conexionId);
        conexion.setRoadmapId(roadmapId);
        when(conexionRepository.findByIdAndActivoTrue(conexionId)).thenReturn(Optional.of(conexion));

        service.eliminar(cursoCohorteId, conexionId);

        assertThat(conexion.isActivo()).isFalse();
        verify(conexionRepository).save(conexion);
    }
}
