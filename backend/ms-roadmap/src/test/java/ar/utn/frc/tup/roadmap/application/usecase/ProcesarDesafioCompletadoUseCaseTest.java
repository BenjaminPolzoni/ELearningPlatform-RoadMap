package ar.utn.frc.tup.roadmap.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ar.utn.frc.tup.roadmap.domain.exception.NodoNoEncontradoException;
import ar.utn.frc.tup.roadmap.domain.exception.TransicionInvalidaException;
import ar.utn.frc.tup.roadmap.domain.model.Dificultad;
import ar.utn.frc.tup.roadmap.domain.model.EstadoNodo;
import ar.utn.frc.tup.roadmap.domain.model.TipoNodo;
import ar.utn.frc.tup.roadmap.domain.port.LectorParametrosPort;
import ar.utn.frc.tup.roadmap.domain.service.CalculadoraXpOtorgadoDesafio;
import ar.utn.frc.tup.roadmap.domain.service.MotorVidas;
import ar.utn.frc.tup.roadmap.domain.service.MotorXp;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.MovimientoXpEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.ProgresoNodoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapNodoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.EventoProcesadoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.MovimientoVidaRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.MovimientoXpRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.ProgresoNodoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapNodoRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Los repositorios se mockean (son infraestructura); {@link MotorXp} y {@link MotorVidas}
 * son objetos reales — son dominio puro y armarlos de verdad es más barato y más fiel
 * que mockearlos.
 */
@ExtendWith(MockitoExtension.class)
class ProcesarDesafioCompletadoUseCaseTest {

    @Mock private EventoProcesadoRepository eventoProcesadoRepository;
    @Mock private RoadmapNodoRepository nodoRepository;
    @Mock private ProgresoNodoRepository progresoRepository;
    @Mock private MovimientoXpRepository movimientoXpRepository;
    @Mock private MovimientoVidaRepository movimientoVidaRepository;
    // Mockeado a propósito: su propia lógica de cascada tiene su test dedicado
    // (EvaluarDesbloqueoServiceTest) — acá solo importa que SE LLAME al completar.
    @Mock private EvaluarDesbloqueoService evaluarDesbloqueoService;

    private ProcesarDesafioCompletadoUseCase useCase;

    private static final UUID ALUMNO_ID = UUID.randomUUID();
    private static final UUID CURSO_ID = UUID.randomUUID();
    private static final UUID NODO_ID = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        LectorParametrosPort parametros = new LectorParametrosPort() {
            @Override public int xpBasePorDificultad(Dificultad d) {
                return switch (d) { case BASICO -> 100; case MEDIO -> 250; case AVANZADO -> 500; };
            }
            @Override public int xpDesafioPersonalizado() { return 30; }
            @Override public int techoVidas() { return 3; }
        };
        MotorXp motorXp = new MotorXp(List.of(new CalculadoraXpOtorgadoDesafio(parametros)));
        MotorVidas motorVidas = new MotorVidas();

        useCase = new ProcesarDesafioCompletadoUseCase(
            eventoProcesadoRepository, nodoRepository, progresoRepository,
            movimientoXpRepository, movimientoVidaRepository, motorXp, motorVidas,
            evaluarDesbloqueoService
        );
    }

    private RoadmapNodoEntity nodoNormal(int reintentosPermitidos) {
        RoadmapNodoEntity nodo = new RoadmapNodoEntity();
        nodo.setTipo(TipoNodo.DESAFIO_PRACTICO);
        nodo.setReintentosPermitidos(reintentosPermitidos);
        return nodo;
    }

    private ProgresoNodoEntity progresoEn(EstadoNodo estado, int intentosUsados) {
        ProgresoNodoEntity p = new ProgresoNodoEntity();
        p.setAlumnoId(ALUMNO_ID);
        p.setCursoCohorteId(CURSO_ID);
        p.setNodoId(NODO_ID);
        p.setEstado(estado);
        p.setIntentosUsados(intentosUsados);
        return p;
    }

    private ProcesarDesafioCompletadoCommand comando(boolean exito) {
        return new ProcesarDesafioCompletadoCommand(
            UUID.randomUUID(), ALUMNO_ID, CURSO_ID, NODO_ID, exito, Dificultad.AVANZADO
        );
    }

    @Test
    void eventoYaProcesado_noTocaNada_idempotencia() {
        var cmd = comando(true);
        when(eventoProcesadoRepository.existsById(cmd.origenEventoId())).thenReturn(true);

        useCase.procesar(cmd);

        verify(nodoRepository, never()).findById(any());
        verify(movimientoXpRepository, never()).save(any());
    }

    @Test
    void nodoInexistente_lanzaNodoNoEncontrado() {
        var cmd = comando(true);
        when(eventoProcesadoRepository.existsById(cmd.origenEventoId())).thenReturn(false);
        when(nodoRepository.findById(NODO_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> useCase.procesar(cmd))
            .isInstanceOf(NodoNoEncontradoException.class);
    }

    @Test
    void exito_sobreNodoHabilitado_otorgaXpSegunDificultadYCompletaElNodo() {
        var cmd = comando(true);
        RoadmapNodoEntity nodo = nodoNormal(1);
        nodo.setActivo(true);
        when(eventoProcesadoRepository.existsById(cmd.origenEventoId())).thenReturn(false);
        when(nodoRepository.findById(NODO_ID)).thenReturn(Optional.of(nodo));
        when(progresoRepository.findByAlumnoIdAndNodoId(ALUMNO_ID, NODO_ID))
            .thenReturn(Optional.of(progresoEn(EstadoNodo.HABILITADO, 0)));

        useCase.procesar(cmd);

        var captor = org.mockito.ArgumentCaptor.forClass(MovimientoXpEntity.class);
        verify(movimientoXpRepository).save(captor.capture());
        assertThat(captor.getValue().getMonto()).isEqualTo(500); // AVANZADO
        assertThat(captor.getValue().getOrigenEventoId()).isEqualTo(cmd.origenEventoId());

        var progresoCaptor = org.mockito.ArgumentCaptor.forClass(ProgresoNodoEntity.class);
        verify(progresoRepository).save(progresoCaptor.capture());
        assertThat(progresoCaptor.getValue().getEstado()).isEqualTo(EstadoNodo.COMPLETADO);

        verify(eventoProcesadoRepository).save(any());
        verify(movimientoVidaRepository, never()).save(any());
        verify(evaluarDesbloqueoService).evaluarTrasCompletar(ALUMNO_ID, CURSO_ID, nodo);
    }

    @Test
    void exito_sobreNodoBloqueado_explota_noSeDeberiaCompletarLoNuncaHabilitado() {
        var cmd = comando(true);
        RoadmapNodoEntity nodo = nodoNormal(1);
        nodo.setActivo(true);
        when(eventoProcesadoRepository.existsById(cmd.origenEventoId())).thenReturn(false);
        when(nodoRepository.findById(NODO_ID)).thenReturn(Optional.of(nodo));
        // sin progreso previo -> se crea uno nuevo en BLOQUEADO (default de la entidad)
        when(progresoRepository.findByAlumnoIdAndNodoId(ALUMNO_ID, NODO_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> useCase.procesar(cmd))
            .isInstanceOf(TransicionInvalidaException.class);
    }

    @Test
    void fallo_conReintentosDisponibles_noDescuentaVidaYSigueHabilitado() {
        var cmd = comando(false);
        RoadmapNodoEntity nodo = nodoNormal(2); // 1 inicial + 2 reintentos = 3 intentos gratis
        nodo.setActivo(true);
        when(eventoProcesadoRepository.existsById(cmd.origenEventoId())).thenReturn(false);
        when(nodoRepository.findById(NODO_ID)).thenReturn(Optional.of(nodo));
        when(progresoRepository.findByAlumnoIdAndNodoId(ALUMNO_ID, NODO_ID))
            .thenReturn(Optional.of(progresoEn(EstadoNodo.HABILITADO, 0))); // va a ser el 1er intento

        useCase.procesar(cmd);

        var progresoCaptor = org.mockito.ArgumentCaptor.forClass(ProgresoNodoEntity.class);
        verify(progresoRepository).save(progresoCaptor.capture());
        assertThat(progresoCaptor.getValue().getEstado()).isEqualTo(EstadoNodo.HABILITADO);
        assertThat(progresoCaptor.getValue().getIntentosUsados()).isEqualTo(1);
        verify(movimientoVidaRepository, never()).save(any());
        verify(evaluarDesbloqueoService, never()).evaluarTrasCompletar(any(), any(), any());
    }

    @Test
    void fallo_agotandoReintentos_descuentaVidaYPasaAFallado() {
        var cmd = comando(false);
        RoadmapNodoEntity nodo = nodoNormal(0); // 1 intento inicial, sin reintentos extra
        nodo.setActivo(true);
        when(eventoProcesadoRepository.existsById(cmd.origenEventoId())).thenReturn(false);
        when(nodoRepository.findById(NODO_ID)).thenReturn(Optional.of(nodo));
        // Ya gastó su único intento gratis (1 = "1 intento inicial + 0 reintentos") en un
        // fallo anterior — este es el 2do intento, el que agota el presupuesto.
        when(progresoRepository.findByAlumnoIdAndNodoId(ALUMNO_ID, NODO_ID))
            .thenReturn(Optional.of(progresoEn(EstadoNodo.HABILITADO, 1)));

        useCase.procesar(cmd);

        var progresoCaptor = org.mockito.ArgumentCaptor.forClass(ProgresoNodoEntity.class);
        verify(progresoRepository).save(progresoCaptor.capture());
        assertThat(progresoCaptor.getValue().getEstado()).isEqualTo(EstadoNodo.FALLADO);

        var vidaCaptor = org.mockito.ArgumentCaptor.forClass(
            ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.MovimientoVidaEntity.class);
        verify(movimientoVidaRepository).save(vidaCaptor.capture());
        assertThat(vidaCaptor.getValue().getTipo())
            .isEqualTo(ar.utn.frc.tup.roadmap.domain.model.TipoMovimientoVida.PERDIDA);
    }

    @Test
    void fallo_estandoYaEnFallado_vuelveADescontarVida_sinPasarPorHabilitado() {
        var cmd = comando(false);
        RoadmapNodoEntity nodo = nodoNormal(0);
        nodo.setActivo(true);
        when(eventoProcesadoRepository.existsById(cmd.origenEventoId())).thenReturn(false);
        when(nodoRepository.findById(NODO_ID)).thenReturn(Optional.of(nodo));
        when(progresoRepository.findByAlumnoIdAndNodoId(ALUMNO_ID, NODO_ID))
            .thenReturn(Optional.of(progresoEn(EstadoNodo.FALLADO, 5)));

        useCase.procesar(cmd);

        var progresoCaptor = org.mockito.ArgumentCaptor.forClass(ProgresoNodoEntity.class);
        verify(progresoRepository).save(progresoCaptor.capture());
        assertThat(progresoCaptor.getValue().getEstado()).isEqualTo(EstadoNodo.FALLADO);
        verify(movimientoVidaRepository).save(any());
    }
}
