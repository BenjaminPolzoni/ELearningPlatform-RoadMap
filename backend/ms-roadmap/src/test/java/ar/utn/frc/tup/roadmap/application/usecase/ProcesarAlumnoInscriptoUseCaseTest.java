package ar.utn.frc.tup.roadmap.application.usecase;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.EventoProcesadoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapSeccionEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.EventoProcesadoRepository;
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
class ProcesarAlumnoInscriptoUseCaseTest {

    @Mock private EventoProcesadoRepository eventoProcesadoRepository;
    @Mock private RoadmapRepository roadmapRepository;
    @Mock private RoadmapSeccionRepository seccionRepository;
    @Mock private EvaluarDesbloqueoService evaluarDesbloqueoService;

    private ProcesarAlumnoInscriptoUseCase useCase;

    private final UUID eventoId = UUID.randomUUID();
    private final UUID alumnoId = UUID.randomUUID();
    private final UUID cc = UUID.randomUUID();
    private final UUID roadmapId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        useCase = new ProcesarAlumnoInscriptoUseCase(
            eventoProcesadoRepository, roadmapRepository, seccionRepository, evaluarDesbloqueoService
        );
    }

    @Test
    void habilitaLasRaicesDeLaPrimeraSeccion_yMarcaElEvento() {
        UUID primeraSeccionId = UUID.randomUUID();
        RoadmapEntity roadmap = new RoadmapEntity();
        roadmap.setId(roadmapId);
        RoadmapSeccionEntity primera = new RoadmapSeccionEntity();
        primera.setId(primeraSeccionId);
        primera.setOrden(1);
        RoadmapSeccionEntity segunda = new RoadmapSeccionEntity();
        segunda.setId(UUID.randomUUID());
        segunda.setOrden(2);

        when(eventoProcesadoRepository.existsById(eventoId)).thenReturn(false);
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cc)).thenReturn(Optional.of(roadmap));
        when(seccionRepository.findByRoadmapIdAndActivoTrueOrderByOrdenAsc(roadmapId))
            .thenReturn(List.of(primera, segunda));

        useCase.procesar(eventoId, alumnoId, cc);

        verify(evaluarDesbloqueoService).habilitarRaicesDeSeccion(alumnoId, cc, primeraSeccionId);
        verify(eventoProcesadoRepository).save(any(EventoProcesadoEntity.class));
    }

    @Test
    void sinRoadmapTodavia_noHabilitaNada_peroMarcaElEvento() {
        when(eventoProcesadoRepository.existsById(eventoId)).thenReturn(false);
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cc)).thenReturn(Optional.empty());

        useCase.procesar(eventoId, alumnoId, cc);

        verify(evaluarDesbloqueoService, never()).habilitarRaicesDeSeccion(any(), any(), any());
        verify(eventoProcesadoRepository).save(any(EventoProcesadoEntity.class));
    }

    @Test
    void eventoRepetido_noHaceNada() {
        when(eventoProcesadoRepository.existsById(eventoId)).thenReturn(true);

        useCase.procesar(eventoId, alumnoId, cc);

        verify(evaluarDesbloqueoService, never()).habilitarRaicesDeSeccion(any(), any(), any());
        verify(eventoProcesadoRepository, never()).save(any());
    }
}
