package ar.utn.frc.tup.roadmap.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import ar.utn.frc.tup.roadmap.domain.exception.PoolRecuperacionVacioException;
import ar.utn.frc.tup.roadmap.domain.exception.RecuperacionNoCorrespondeException;
import ar.utn.frc.tup.roadmap.domain.model.Dificultad;
import ar.utn.frc.tup.roadmap.domain.model.TipoMovimientoVida;
import ar.utn.frc.tup.roadmap.domain.port.LectorParametrosPort;
import ar.utn.frc.tup.roadmap.domain.service.MotorVidas;
import ar.utn.frc.tup.roadmap.domain.service.SelectorRecuperacion;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.DesafioRecuperacionEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.MovimientoVidaEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.DesafioRecuperacionRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.MovimientoVidaRepository;
import java.util.List;
import java.util.Random;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** {@link MotorVidas} y {@link SelectorRecuperacion} son reales — dominio puro. */
@ExtendWith(MockitoExtension.class)
class IniciarRecuperacionUseCaseTest {

    @Mock private MovimientoVidaRepository movimientoVidaRepository;
    @Mock private DesafioRecuperacionRepository desafioRecuperacionRepository;

    private IniciarRecuperacionUseCase useCase;

    private static final UUID ALUMNO_ID = UUID.randomUUID();
    private static final UUID CURSO_ID = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        LectorParametrosPort parametros = new LectorParametrosPort() {
            @Override public int xpBasePorDificultad(Dificultad d) { return 0; }
            @Override public int xpDesafioPersonalizado() { return 0; }
            @Override public int techoVidas() { return 3; }
        };
        useCase = new IniciarRecuperacionUseCase(
            movimientoVidaRepository, desafioRecuperacionRepository,
            parametros, new MotorVidas(), new SelectorRecuperacion(new Random(1))
        );
    }

    private MovimientoVidaEntity movimiento(TipoMovimientoVida tipo) {
        MovimientoVidaEntity m = new MovimientoVidaEntity();
        m.setTipo(tipo);
        return m;
    }

    @Test
    void rechaza_siElAlumnoTodaviaTieneVidas() {
        when(movimientoVidaRepository.findByAlumnoIdAndCursoCohorteIdOrderByRegistradoEnAsc(ALUMNO_ID, CURSO_ID))
            .thenReturn(List.of(movimiento(TipoMovimientoVida.INICIAL)));

        assertThatThrownBy(() -> useCase.iniciar(ALUMNO_ID, CURSO_ID))
            .isInstanceOf(RecuperacionNoCorrespondeException.class);
    }

    @Test
    void rechaza_siElPoolDeRecuperacionEstaVacio() {
        when(movimientoVidaRepository.findByAlumnoIdAndCursoCohorteIdOrderByRegistradoEnAsc(ALUMNO_ID, CURSO_ID))
            .thenReturn(List.of(movimiento(TipoMovimientoVida.INICIAL), movimiento(TipoMovimientoVida.PERDIDA)));
        when(desafioRecuperacionRepository.findByCursoCohorteIdAndActivoTrue(CURSO_ID)).thenReturn(List.of());

        assertThatThrownBy(() -> useCase.iniciar(ALUMNO_ID, CURSO_ID))
            .isInstanceOf(PoolRecuperacionVacioException.class);
    }

    @Test
    void devuelveElDesafioIdExterno_delElegidoDelPool_conCeroVidas() {
        when(movimientoVidaRepository.findByAlumnoIdAndCursoCohorteIdOrderByRegistradoEnAsc(ALUMNO_ID, CURSO_ID))
            .thenReturn(List.of(movimiento(TipoMovimientoVida.INICIAL), movimiento(TipoMovimientoVida.PERDIDA)));

        DesafioRecuperacionEntity item = new DesafioRecuperacionEntity();
        item.setId(UUID.randomUUID());
        UUID desafioExternoId = UUID.randomUUID();
        item.setDesafioId(desafioExternoId);
        when(desafioRecuperacionRepository.findByCursoCohorteIdAndActivoTrue(CURSO_ID)).thenReturn(List.of(item));
        when(movimientoVidaRepository.findDesafiosRecuperacionResueltos(ALUMNO_ID, CURSO_ID, TipoMovimientoVida.RECUPERADA))
            .thenReturn(List.of());

        UUID resultado = useCase.iniciar(ALUMNO_ID, CURSO_ID);

        assertThat(resultado).isEqualTo(desafioExternoId);
    }

    @Test
    void priorizaLosNoResueltos_sobreLosYaResueltos() {
        when(movimientoVidaRepository.findByAlumnoIdAndCursoCohorteIdOrderByRegistradoEnAsc(ALUMNO_ID, CURSO_ID))
            .thenReturn(List.of(movimiento(TipoMovimientoVida.PERDIDA)));

        DesafioRecuperacionEntity yaResuelto = new DesafioRecuperacionEntity();
        yaResuelto.setId(UUID.randomUUID());
        yaResuelto.setDesafioId(UUID.randomUUID());
        DesafioRecuperacionEntity sinResolver = new DesafioRecuperacionEntity();
        sinResolver.setId(UUID.randomUUID());
        UUID desafioSinResolverExternoId = UUID.randomUUID();
        sinResolver.setDesafioId(desafioSinResolverExternoId);

        when(desafioRecuperacionRepository.findByCursoCohorteIdAndActivoTrue(CURSO_ID))
            .thenReturn(List.of(yaResuelto, sinResolver));
        when(movimientoVidaRepository.findDesafiosRecuperacionResueltos(ALUMNO_ID, CURSO_ID, TipoMovimientoVida.RECUPERADA))
            .thenReturn(List.of(yaResuelto.getId()));

        UUID resultado = useCase.iniciar(ALUMNO_ID, CURSO_ID);

        assertThat(resultado).isEqualTo(desafioSinResolverExternoId);
    }
}
