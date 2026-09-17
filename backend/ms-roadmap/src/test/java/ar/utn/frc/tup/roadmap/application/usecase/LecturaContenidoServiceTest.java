package ar.utn.frc.tup.roadmap.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ar.utn.frc.tup.roadmap.domain.exception.LecturaContenidoNoAutorizadaException;
import ar.utn.frc.tup.roadmap.domain.model.EstadoNodo;
import ar.utn.frc.tup.roadmap.domain.model.TipoNodo;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.LecturaContenidoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.ProgresoNodoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapNodoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapSeccionEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.LecturaContenidoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.ProgresoNodoRepository;
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
class LecturaContenidoServiceTest {

    @Mock private RoadmapRepository roadmapRepository;
    @Mock private RoadmapSeccionRepository seccionRepository;
    @Mock private RoadmapNodoRepository nodoRepository;
    @Mock private ProgresoNodoRepository progresoRepository;
    @Mock private LecturaContenidoRepository lecturaRepository;
    @Mock private GuardaCursoArchivado guardaCursoArchivado;

    private LecturaContenidoService service;
    private final UUID alumnoId = UUID.randomUUID();
    private final UUID cursoId = UUID.randomUUID();
    private final UUID roadmapId = UUID.randomUUID();
    private final UUID unidadId = UUID.randomUUID();
    private final UUID nodoId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new LecturaContenidoService(
            roadmapRepository, seccionRepository, nodoRepository, progresoRepository,
            lecturaRepository, guardaCursoArchivado
        );
    }

    @Test
    void marcarLeido_esIdempotente_yNoInsertaElDuplicado() {
        prepararNodo(EstadoNodo.HABILITADO, TipoNodo.TEORIA);
        LecturaContenidoEntity existente = lectura();
        when(lecturaRepository.findByAlumnoIdAndCursoCohorteIdAndNodoId(alumnoId, cursoId, nodoId))
            .thenReturn(Optional.of(existente));

        var respuesta = service.marcarLeido(alumnoId, cursoId, nodoId);

        assertThat(respuesta.nueva()).isFalse();
        verify(lecturaRepository, never()).save(any());
    }

    @Test
    void marcarLeido_rechazaNodoBloqueado() {
        prepararNodo(EstadoNodo.BLOQUEADO, TipoNodo.TEORIA);

        assertThatThrownBy(() -> service.marcarLeido(alumnoId, cursoId, nodoId))
            .isInstanceOf(LecturaContenidoNoAutorizadaException.class);
        verify(lecturaRepository, never()).save(any());
    }

    @Test
    void avance_cuentaSoloContenidoObligatorioActivo() {
        RoadmapEntity roadmap = new RoadmapEntity();
        roadmap.setId(roadmapId);
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoId)).thenReturn(Optional.of(roadmap));
        RoadmapSeccionEntity unidad = new RoadmapSeccionEntity();
        unidad.setId(unidadId);
        unidad.setRoadmapId(roadmapId);
        when(seccionRepository.findByIdAndActivoTrue(unidadId)).thenReturn(Optional.of(unidad));

        RoadmapNodoEntity nodo = nodo(TipoNodo.TEORIA, true);
        when(nodoRepository.findBySeccionIdAndActivoTrueAndTipoIn(eq(unidadId), any()))
            .thenReturn(List.of(nodo));
        when(lecturaRepository.findByAlumnoIdAndCursoCohorteIdAndNodoIdIn(
            alumnoId, cursoId, List.of(nodoId)
        )).thenReturn(List.of(lectura()));

        var avance = service.avanceUnidad(alumnoId, cursoId, unidadId);

        assertThat(avance.contenidosObligatorios()).isEqualTo(1);
        assertThat(avance.contenidosLeidos()).isEqualTo(1);
        assertThat(avance.porcentaje()).isEqualTo(100);
    }

    private void prepararNodo(EstadoNodo estado, TipoNodo tipo) {
        RoadmapEntity roadmap = new RoadmapEntity();
        roadmap.setId(roadmapId);
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoId)).thenReturn(Optional.of(roadmap));
        RoadmapNodoEntity nodo = nodo(tipo, true);
        when(nodoRepository.findByIdAndActivoTrue(nodoId)).thenReturn(Optional.of(nodo));
        RoadmapSeccionEntity unidad = new RoadmapSeccionEntity();
        unidad.setId(unidadId);
        unidad.setRoadmapId(roadmapId);
        when(seccionRepository.findByIdAndActivoTrue(unidadId)).thenReturn(Optional.of(unidad));
        ProgresoNodoEntity progreso = new ProgresoNodoEntity();
        progreso.setCursoCohorteId(cursoId);
        progreso.setEstado(estado);
        when(progresoRepository.findByAlumnoIdAndNodoId(alumnoId, nodoId)).thenReturn(Optional.of(progreso));
    }

    private RoadmapNodoEntity nodo(TipoNodo tipo, boolean obligatorio) {
        RoadmapNodoEntity nodo = new RoadmapNodoEntity();
        nodo.setId(nodoId);
        nodo.setSeccionId(unidadId);
        nodo.setTipo(tipo);
        nodo.setEsObligatorio(obligatorio);
        return nodo;
    }

    private LecturaContenidoEntity lectura() {
        LecturaContenidoEntity lectura = new LecturaContenidoEntity();
        lectura.setAlumnoId(alumnoId);
        lectura.setCursoCohorteId(cursoId);
        lectura.setNodoId(nodoId);
        return lectura;
    }
}
