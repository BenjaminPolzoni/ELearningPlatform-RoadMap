package ar.utn.frc.tup.roadmap.application.usecase;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import ar.utn.frc.tup.roadmap.domain.exception.CursoArchivadoException;
import ar.utn.frc.tup.roadmap.domain.model.EstadoCursoCohorte;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.CursoCohorteContextoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.CursoCohorteContextoRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class GuardaCursoArchivadoTest {

    @Mock private CursoCohorteContextoRepository contextoRepository;
    private GuardaCursoArchivado guarda;
    private final UUID cc = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        guarda = new GuardaCursoArchivado(contextoRepository);
    }

    @Test
    void explota_cuandoElCursoEstaArchivado() {
        CursoCohorteContextoEntity ctx = new CursoCohorteContextoEntity();
        ctx.setEstado(EstadoCursoCohorte.ARCHIVADO);
        when(contextoRepository.findByCursoCohorteId(cc)).thenReturn(Optional.of(ctx));

        assertThatThrownBy(() -> guarda.exigirNoArchivado(cc)).isInstanceOf(CursoArchivadoException.class);
    }

    @Test
    void pasa_cuandoNoHayContexto_oNoEstaArchivado() {
        when(contextoRepository.findByCursoCohorteId(cc)).thenReturn(Optional.empty());
        assertThatCode(() -> guarda.exigirNoArchivado(cc)).doesNotThrowAnyException();

        CursoCohorteContextoEntity activo = new CursoCohorteContextoEntity();
        activo.setEstado(EstadoCursoCohorte.ACTIVO);
        when(contextoRepository.findByCursoCohorteId(cc)).thenReturn(Optional.of(activo));
        assertThatCode(() -> guarda.exigirNoArchivado(cc)).doesNotThrowAnyException();
    }
}
