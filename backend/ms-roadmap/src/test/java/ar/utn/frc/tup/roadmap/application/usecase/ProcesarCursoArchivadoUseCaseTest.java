package ar.utn.frc.tup.roadmap.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ar.utn.frc.tup.roadmap.domain.model.EstadoCursoCohorte;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.CursoCohorteContextoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.EventoProcesadoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.CursoCohorteContextoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.EventoProcesadoRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProcesarCursoArchivadoUseCaseTest {

    @Mock private EventoProcesadoRepository eventoProcesadoRepository;
    @Mock private CursoCohorteContextoRepository contextoRepository;

    private ProcesarCursoArchivadoUseCase useCase;

    private final UUID eventoId = UUID.randomUUID();
    private final UUID cc = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        useCase = new ProcesarCursoArchivadoUseCase(eventoProcesadoRepository, contextoRepository);
    }

    @Test
    void marcaArchivado_creandoElContextoSiNoExistia_yGuardaInscriptos() {
        when(eventoProcesadoRepository.existsById(eventoId)).thenReturn(false);
        when(contextoRepository.findByCursoCohorteId(cc)).thenReturn(Optional.empty());
        when(contextoRepository.save(any(CursoCohorteContextoEntity.class))).thenAnswer(i -> i.getArgument(0));

        useCase.procesar(eventoId, cc, 25);

        ArgumentCaptor<CursoCohorteContextoEntity> cap = ArgumentCaptor.forClass(CursoCohorteContextoEntity.class);
        verify(contextoRepository).save(cap.capture());
        assertThat(cap.getValue().getEstado()).isEqualTo(EstadoCursoCohorte.ARCHIVADO);
        assertThat(cap.getValue().getInscriptosActivos()).isEqualTo(25);
        verify(eventoProcesadoRepository).save(any(EventoProcesadoEntity.class));
    }

    @Test
    void inscriptosNull_dejaElValorPrevio() {
        CursoCohorteContextoEntity previo = new CursoCohorteContextoEntity();
        previo.setCursoCohorteId(cc);
        previo.setEstado(EstadoCursoCohorte.ACTIVO);
        previo.setInscriptosActivos(12);
        when(eventoProcesadoRepository.existsById(eventoId)).thenReturn(false);
        when(contextoRepository.findByCursoCohorteId(cc)).thenReturn(Optional.of(previo));
        when(contextoRepository.save(any(CursoCohorteContextoEntity.class))).thenAnswer(i -> i.getArgument(0));

        useCase.procesar(eventoId, cc, null);

        assertThat(previo.getEstado()).isEqualTo(EstadoCursoCohorte.ARCHIVADO);
        assertThat(previo.getInscriptosActivos()).isEqualTo(12);
    }

    @Test
    void eventoRepetido_noHaceNada() {
        when(eventoProcesadoRepository.existsById(eventoId)).thenReturn(true);

        useCase.procesar(eventoId, cc, 99);

        verify(contextoRepository, never()).save(any());
        verify(eventoProcesadoRepository, never()).save(any());
    }
}
