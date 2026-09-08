package ar.utn.frc.tup.roadmap.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ar.utn.frc.tup.roadmap.domain.exception.NodoInvalidoException;
import ar.utn.frc.tup.roadmap.domain.exception.SeccionNoEncontradaException;
import ar.utn.frc.tup.roadmap.domain.model.TipoNodo;
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
class NodoServiceTest {

    @Mock private RoadmapRepository roadmapRepository;
    @Mock private RoadmapSeccionRepository seccionRepository;
    @Mock private RoadmapNodoRepository nodoRepository;
    @Mock private RoadmapConexionRepository conexionRepository;

    private NodoService service;

    private final UUID cursoCohorteId = UUID.randomUUID();
    private final UUID roadmapId = UUID.randomUUID();
    private final UUID seccionId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new NodoService(
            roadmapRepository, seccionRepository, nodoRepository, conexionRepository
        );
    }

    private void roadmapYSeccionActivos() {
        RoadmapEntity roadmap = new RoadmapEntity();
        roadmap.setId(roadmapId);
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId))
            .thenReturn(Optional.of(roadmap));
        RoadmapSeccionEntity seccion = new RoadmapSeccionEntity();
        seccion.setId(seccionId);
        seccion.setRoadmapId(roadmapId);
        when(seccionRepository.findByIdAndActivoTrue(seccionId)).thenReturn(Optional.of(seccion));
    }

    @Test
    void crear_aplicaDefaults_yCuelgaDeLaSeccion() {
        roadmapYSeccionActivos();
        when(nodoRepository.save(any(RoadmapNodoEntity.class))).thenAnswer(i -> i.getArgument(0));

        RoadmapNodoEntity nodo = service.crear(
            cursoCohorteId, seccionId, TipoNodo.DESAFIO_TEORICO, UUID.randomUUID(),
            10.0, 20.0, true, 2
        );

        assertThat(nodo.getSeccionId()).isEqualTo(seccionId);
        assertThat(nodo.getTipo()).isEqualTo(TipoNodo.DESAFIO_TEORICO);
        assertThat(nodo.isEsObligatorio()).isTrue();
        assertThat(nodo.getReintentosPermitidos()).isEqualTo(2);
    }

    @Test
    void crear_lanzaSeccionNoEncontrada_cuandoLaSeccionEsDeOtroRoadmap() {
        RoadmapEntity roadmap = new RoadmapEntity();
        roadmap.setId(roadmapId);
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId))
            .thenReturn(Optional.of(roadmap));
        RoadmapSeccionEntity ajena = new RoadmapSeccionEntity();
        ajena.setRoadmapId(UUID.randomUUID());
        when(seccionRepository.findByIdAndActivoTrue(seccionId)).thenReturn(Optional.of(ajena));

        assertThatThrownBy(() -> service.crear(
            cursoCohorteId, seccionId, TipoNodo.TEORIA, null, 0, 0, true, 0
        )).isInstanceOf(SeccionNoEncontradaException.class);
    }

    @Test
    void crear_rechazaHitoConDesafioId() {
        roadmapYSeccionActivos();

        assertThatThrownBy(() -> service.crear(
            cursoCohorteId, seccionId, TipoNodo.HITO, UUID.randomUUID(), 0, 0, false, 0
        )).isInstanceOf(NodoInvalidoException.class);
        verify(nodoRepository, never()).save(any());
    }

    @Test
    void crear_hitoSinDesafioId_quedaConDesafioIdNulo() {
        roadmapYSeccionActivos();
        when(nodoRepository.save(any(RoadmapNodoEntity.class))).thenAnswer(i -> i.getArgument(0));

        RoadmapNodoEntity nodo = service.crear(
            cursoCohorteId, seccionId, TipoNodo.HITO, null, 1, 1, false, 0
        );

        assertThat(nodo.getDesafioId()).isNull();
        assertThat(nodo.getTipo()).isEqualTo(TipoNodo.HITO);
    }

    @Test
    void actualizar_mueveElNodoAOtraSeccionDelMismoRoadmap() {
        RoadmapEntity roadmap = new RoadmapEntity();
        roadmap.setId(roadmapId);
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId))
            .thenReturn(Optional.of(roadmap));

        UUID nodoId = UUID.randomUUID();
        UUID seccionOrigenId = UUID.randomUUID();
        UUID seccionDestinoId = UUID.randomUUID();

        RoadmapNodoEntity nodo = new RoadmapNodoEntity();
        nodo.setId(nodoId);
        nodo.setSeccionId(seccionOrigenId);
        when(nodoRepository.findByIdAndActivoTrue(nodoId)).thenReturn(Optional.of(nodo));

        RoadmapSeccionEntity seccionOrigen = new RoadmapSeccionEntity();
        seccionOrigen.setId(seccionOrigenId);
        seccionOrigen.setRoadmapId(roadmapId);
        RoadmapSeccionEntity seccionDestino = new RoadmapSeccionEntity();
        seccionDestino.setId(seccionDestinoId);
        seccionDestino.setRoadmapId(roadmapId);
        when(seccionRepository.findByIdAndActivoTrue(seccionOrigenId))
            .thenReturn(Optional.of(seccionOrigen));
        when(seccionRepository.findByIdAndActivoTrue(seccionDestinoId))
            .thenReturn(Optional.of(seccionDestino));
        when(nodoRepository.save(any(RoadmapNodoEntity.class))).thenAnswer(i -> i.getArgument(0));

        RoadmapNodoEntity resultado = service.actualizar(
            cursoCohorteId, nodoId, seccionDestinoId, TipoNodo.PRACTICA, null, 5, 5, true, 1
        );

        assertThat(resultado.getSeccionId()).isEqualTo(seccionDestinoId);
        assertThat(resultado.getTipo()).isEqualTo(TipoNodo.PRACTICA);
    }

    @Test
    void eliminar_daDeBajaElNodoYSusConexiones() {
        RoadmapEntity roadmap = new RoadmapEntity();
        roadmap.setId(roadmapId);
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId))
            .thenReturn(Optional.of(roadmap));

        UUID nodoId = UUID.randomUUID();
        RoadmapNodoEntity nodo = new RoadmapNodoEntity();
        nodo.setId(nodoId);
        nodo.setSeccionId(seccionId);
        when(nodoRepository.findByIdAndActivoTrue(nodoId)).thenReturn(Optional.of(nodo));
        RoadmapSeccionEntity seccion = new RoadmapSeccionEntity();
        seccion.setId(seccionId);
        seccion.setRoadmapId(roadmapId);
        when(seccionRepository.findByIdAndActivoTrue(seccionId)).thenReturn(Optional.of(seccion));

        RoadmapConexionEntity conexion = new RoadmapConexionEntity();
        conexion.setId(UUID.randomUUID());
        when(conexionRepository.findActivasQueTocan(List.of(nodoId))).thenReturn(List.of(conexion));

        service.eliminar(cursoCohorteId, nodoId);

        assertThat(nodo.isActivo()).isFalse();
        assertThat(conexion.isActivo()).isFalse();
        verify(nodoRepository).save(nodo);
        verify(conexionRepository).saveAll(List.of(conexion));
    }
}
