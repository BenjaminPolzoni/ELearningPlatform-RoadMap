package ar.utn.frc.tup.roadmap.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ar.utn.frc.tup.roadmap.domain.model.EstadoNodo;
import ar.utn.frc.tup.roadmap.domain.service.MotorDesbloqueo;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.ProgresoNodoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapConexionEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapNodoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapSeccionEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.MovimientoXpRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.ProgresoNodoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapConexionRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapNodoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapSeccionRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** {@link MotorDesbloqueo} es real (dominio puro); los repositorios se mockean. */
@ExtendWith(MockitoExtension.class)
class EvaluarDesbloqueoServiceTest {

    @Mock private RoadmapNodoRepository nodoRepository;
    @Mock private RoadmapConexionRepository conexionRepository;
    @Mock private RoadmapSeccionRepository seccionRepository;
    @Mock private ProgresoNodoRepository progresoRepository;
    @Mock private MovimientoXpRepository movimientoXpRepository;

    private EvaluarDesbloqueoService service;

    private static final UUID ALUMNO_ID = UUID.randomUUID();
    private static final UUID CURSO_ID = UUID.randomUUID();
    private static final UUID ROADMAP_ID = UUID.randomUUID();
    private static final UUID SECCION_ACTUAL_ID = UUID.randomUUID();
    private static final UUID NODO_COMPLETADO_ID = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new EvaluarDesbloqueoService(
            nodoRepository, conexionRepository, seccionRepository,
            progresoRepository, movimientoXpRepository, new MotorDesbloqueo()
        );
        // Sin sucesores ni sección siguiente por default — cada test agrega lo suyo.
        when(conexionRepository.findByNodoOrigenIdAndActivoTrue(NODO_COMPLETADO_ID)).thenReturn(List.of());
    }

    private RoadmapNodoEntity nodoCompletado() {
        RoadmapNodoEntity nodo = new RoadmapNodoEntity();
        nodo.setId(NODO_COMPLETADO_ID);
        nodo.setSeccionId(SECCION_ACTUAL_ID);
        return nodo;
    }

    private void sinSeccionSiguiente() {
        RoadmapSeccionEntity actual = new RoadmapSeccionEntity();
        actual.setId(SECCION_ACTUAL_ID);
        actual.setRoadmapId(ROADMAP_ID);
        actual.setOrden(1);
        when(seccionRepository.findById(SECCION_ACTUAL_ID)).thenReturn(Optional.of(actual));
        when(seccionRepository.findFirstByRoadmapIdAndOrdenGreaterThanAndActivoTrueOrderByOrdenAsc(ROADMAP_ID, 1))
            .thenReturn(Optional.empty());
    }

    // ── Sucesores directos dentro de la misma sección ─────────────────────

    @Test
    void habilitaElSucesorDirecto_siNoTieneOtrosPrerequisitos() {
        UUID sucesorId = UUID.randomUUID();
        RoadmapConexionEntity conexion = new RoadmapConexionEntity();
        conexion.setNodoOrigenId(NODO_COMPLETADO_ID);
        conexion.setNodoDestinoId(sucesorId);
        when(conexionRepository.findByNodoOrigenIdAndActivoTrue(NODO_COMPLETADO_ID)).thenReturn(List.of(conexion));
        when(conexionRepository.findByNodoDestinoIdAndActivoTrue(sucesorId)).thenReturn(List.of(conexion));
        when(progresoRepository.findByAlumnoIdAndNodoIdIn(ALUMNO_ID, List.of(NODO_COMPLETADO_ID)))
            .thenReturn(List.of(progresoCon(NODO_COMPLETADO_ID, EstadoNodo.COMPLETADO)));
        when(progresoRepository.findByAlumnoIdAndNodoId(ALUMNO_ID, sucesorId)).thenReturn(Optional.empty());
        sinSeccionSiguiente();

        service.evaluarTrasCompletar(ALUMNO_ID, CURSO_ID, nodoCompletado());

        ArgumentCaptor<ProgresoNodoEntity> captor = ArgumentCaptor.forClass(ProgresoNodoEntity.class);
        verify(progresoRepository).save(captor.capture());
        assertThat(captor.getValue().getNodoId()).isEqualTo(sucesorId);
        assertThat(captor.getValue().getEstado()).isEqualTo(EstadoNodo.HABILITADO);
    }

    @Test
    void noHabilitaElSucesor_siLeFaltaOtroPrerequisito_nodoDeFusion() {
        UUID sucesorId = UUID.randomUUID();
        UUID otroPrerequisitoId = UUID.randomUUID();

        RoadmapConexionEntity conexionCompletada = new RoadmapConexionEntity();
        conexionCompletada.setNodoOrigenId(NODO_COMPLETADO_ID);
        conexionCompletada.setNodoDestinoId(sucesorId);

        RoadmapConexionEntity conexionPendiente = new RoadmapConexionEntity();
        conexionPendiente.setNodoOrigenId(otroPrerequisitoId);
        conexionPendiente.setNodoDestinoId(sucesorId);

        when(conexionRepository.findByNodoOrigenIdAndActivoTrue(NODO_COMPLETADO_ID))
            .thenReturn(List.of(conexionCompletada));
        when(conexionRepository.findByNodoDestinoIdAndActivoTrue(sucesorId))
            .thenReturn(List.of(conexionCompletada, conexionPendiente));
        when(progresoRepository.findByAlumnoIdAndNodoIdIn(ALUMNO_ID, List.of(NODO_COMPLETADO_ID, otroPrerequisitoId)))
            .thenReturn(List.of(
                progresoCon(NODO_COMPLETADO_ID, EstadoNodo.COMPLETADO),
                progresoCon(otroPrerequisitoId, EstadoNodo.HABILITADO) // el otro prerequisito NO completó
            ));
        sinSeccionSiguiente();

        service.evaluarTrasCompletar(ALUMNO_ID, CURSO_ID, nodoCompletado());

        verify(progresoRepository, never()).save(any());
    }

    @Test
    void noHabilitaElSucesor_siYaEstaHabilitadoOMas_esIdempotente() {
        UUID sucesorId = UUID.randomUUID();
        RoadmapConexionEntity conexion = new RoadmapConexionEntity();
        conexion.setNodoOrigenId(NODO_COMPLETADO_ID);
        conexion.setNodoDestinoId(sucesorId);
        when(conexionRepository.findByNodoOrigenIdAndActivoTrue(NODO_COMPLETADO_ID)).thenReturn(List.of(conexion));
        when(conexionRepository.findByNodoDestinoIdAndActivoTrue(sucesorId)).thenReturn(List.of(conexion));
        when(progresoRepository.findByAlumnoIdAndNodoIdIn(ALUMNO_ID, List.of(NODO_COMPLETADO_ID)))
            .thenReturn(List.of(progresoCon(NODO_COMPLETADO_ID, EstadoNodo.COMPLETADO)));
        when(progresoRepository.findByAlumnoIdAndNodoId(ALUMNO_ID, sucesorId))
            .thenReturn(Optional.of(progresoCon(sucesorId, EstadoNodo.HABILITADO))); // ya habilitado
        sinSeccionSiguiente();

        service.evaluarTrasCompletar(ALUMNO_ID, CURSO_ID, nodoCompletado());

        verify(progresoRepository, never()).save(any());
    }

    // ── Sección siguiente por umbral de XP ────────────────────────────────

    @Test
    void habilitaLosNodosRaiz_deLaSiguienteSeccion_siSeSuperaElUmbral() {
        UUID seccionSiguienteId = UUID.randomUUID();
        UUID raizId = UUID.randomUUID();

        when(conexionRepository.findByNodoOrigenIdAndActivoTrue(NODO_COMPLETADO_ID)).thenReturn(List.of());

        RoadmapSeccionEntity actual = new RoadmapSeccionEntity();
        actual.setId(SECCION_ACTUAL_ID);
        actual.setRoadmapId(ROADMAP_ID);
        actual.setOrden(1);
        RoadmapSeccionEntity siguiente = new RoadmapSeccionEntity();
        siguiente.setId(seccionSiguienteId);
        siguiente.setUmbralXpDesbloqueo(500);

        when(seccionRepository.findById(SECCION_ACTUAL_ID)).thenReturn(Optional.of(actual));
        when(seccionRepository.findFirstByRoadmapIdAndOrdenGreaterThanAndActivoTrueOrderByOrdenAsc(ROADMAP_ID, 1))
            .thenReturn(Optional.of(siguiente));

        RoadmapNodoEntity nodoDeLaSeccion = new RoadmapNodoEntity();
        nodoDeLaSeccion.setId(NODO_COMPLETADO_ID);
        when(nodoRepository.findBySeccionIdAndActivoTrue(SECCION_ACTUAL_ID)).thenReturn(List.of(nodoDeLaSeccion));
        when(movimientoXpRepository.sumarMontoPorAlumnoYNodos(eq(ALUMNO_ID), any())).thenReturn(500);

        RoadmapNodoEntity raiz = new RoadmapNodoEntity();
        raiz.setId(raizId);
        when(nodoRepository.findNodosRaizDeSeccion(seccionSiguienteId)).thenReturn(List.of(raiz));
        when(progresoRepository.findByAlumnoIdAndNodoId(ALUMNO_ID, raizId)).thenReturn(Optional.empty());

        service.evaluarTrasCompletar(ALUMNO_ID, CURSO_ID, nodoCompletado());

        ArgumentCaptor<ProgresoNodoEntity> captor = ArgumentCaptor.forClass(ProgresoNodoEntity.class);
        verify(progresoRepository).save(captor.capture());
        assertThat(captor.getValue().getNodoId()).isEqualTo(raizId);
        assertThat(captor.getValue().getEstado()).isEqualTo(EstadoNodo.HABILITADO);
    }

    @Test
    void noHabilitaLaSiguienteSeccion_siNoAlcanzaElXp() {
        UUID seccionSiguienteId = UUID.randomUUID();

        RoadmapSeccionEntity actual = new RoadmapSeccionEntity();
        actual.setId(SECCION_ACTUAL_ID);
        actual.setRoadmapId(ROADMAP_ID);
        actual.setOrden(1);
        RoadmapSeccionEntity siguiente = new RoadmapSeccionEntity();
        siguiente.setId(seccionSiguienteId);
        siguiente.setUmbralXpDesbloqueo(500);

        when(seccionRepository.findById(SECCION_ACTUAL_ID)).thenReturn(Optional.of(actual));
        when(seccionRepository.findFirstByRoadmapIdAndOrdenGreaterThanAndActivoTrueOrderByOrdenAsc(ROADMAP_ID, 1))
            .thenReturn(Optional.of(siguiente));
        when(nodoRepository.findBySeccionIdAndActivoTrue(SECCION_ACTUAL_ID)).thenReturn(List.of());
        when(movimientoXpRepository.sumarMontoPorAlumnoYNodos(eq(ALUMNO_ID), any())).thenReturn(499);

        service.evaluarTrasCompletar(ALUMNO_ID, CURSO_ID, nodoCompletado());

        verify(nodoRepository, never()).findNodosRaizDeSeccion(any());
        verify(progresoRepository, never()).save(any());
    }

    @Test
    void noExplota_siEsLaUltimaSeccionDelRoadmap() {
        sinSeccionSiguiente();

        service.evaluarTrasCompletar(ALUMNO_ID, CURSO_ID, nodoCompletado());

        verify(progresoRepository, never()).save(any());
    }

    private ProgresoNodoEntity progresoCon(UUID nodoId, EstadoNodo estado) {
        ProgresoNodoEntity p = new ProgresoNodoEntity();
        p.setNodoId(nodoId);
        p.setEstado(estado);
        return p;
    }
}
