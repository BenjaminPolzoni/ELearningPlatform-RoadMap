package ar.utn.frc.tup.roadmap.application.usecase;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ar.utn.frc.tup.roadmap.domain.model.TipoMovimientoVida;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.MovimientoVidaEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.EventoProcesadoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.MovimientoVidaRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProcesarRecuperacionCompletadaUseCaseTest {

    @Mock private EventoProcesadoRepository eventoProcesadoRepository;
    @Mock private MovimientoVidaRepository movimientoVidaRepository;

    private ProcesarRecuperacionCompletadaUseCase useCase;

    private ProcesarRecuperacionCompletadaCommand comando(boolean exito) {
        return new ProcesarRecuperacionCompletadaCommand(
            UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), exito
        );
    }

    @Test
    void eventoYaProcesado_noHaceNada() {
        useCase = new ProcesarRecuperacionCompletadaUseCase(eventoProcesadoRepository, movimientoVidaRepository);
        var cmd = comando(true);
        when(eventoProcesadoRepository.existsById(cmd.origenEventoId())).thenReturn(true);

        useCase.procesar(cmd);

        verify(movimientoVidaRepository, never()).save(any());
        verify(eventoProcesadoRepository, never()).save(any());
    }

    @Test
    void exito_otorgaExactamenteUnaVidaRecuperada() {
        useCase = new ProcesarRecuperacionCompletadaUseCase(eventoProcesadoRepository, movimientoVidaRepository);
        var cmd = comando(true);
        when(eventoProcesadoRepository.existsById(cmd.origenEventoId())).thenReturn(false);

        useCase.procesar(cmd);

        ArgumentCaptor<MovimientoVidaEntity> captor = ArgumentCaptor.forClass(MovimientoVidaEntity.class);
        verify(movimientoVidaRepository).save(captor.capture());
        MovimientoVidaEntity guardado = captor.getValue();
        org.assertj.core.api.Assertions.assertThat(guardado.getTipo()).isEqualTo(TipoMovimientoVida.RECUPERADA);
        org.assertj.core.api.Assertions.assertThat(guardado.getDesafioRecuperacionId()).isEqualTo(cmd.recuperacionId());
        verify(eventoProcesadoRepository).save(any());
    }

    @Test
    void fallo_noRegistraNingunMovimiento_peroSiMarcaElEventoComoProcesado() {
        useCase = new ProcesarRecuperacionCompletadaUseCase(eventoProcesadoRepository, movimientoVidaRepository);
        var cmd = comando(false);
        when(eventoProcesadoRepository.existsById(cmd.origenEventoId())).thenReturn(false);

        useCase.procesar(cmd);

        verify(movimientoVidaRepository, never()).save(any());
        verify(eventoProcesadoRepository).save(any());
    }
}
