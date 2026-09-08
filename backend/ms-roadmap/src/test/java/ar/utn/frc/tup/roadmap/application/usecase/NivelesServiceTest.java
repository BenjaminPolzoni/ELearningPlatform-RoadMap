package ar.utn.frc.tup.roadmap.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ar.utn.frc.tup.roadmap.domain.exception.CurvaNivelesInvalidaException;
import ar.utn.frc.tup.roadmap.domain.exception.CursoArchivadoException;
import ar.utn.frc.tup.roadmap.domain.exception.RoadmapNoEncontradoException;
import ar.utn.frc.tup.roadmap.domain.model.Nivel;
import ar.utn.frc.tup.roadmap.domain.service.CurvaNiveles;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.NivelDefinicionEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.NivelDefinicionRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NivelesServiceTest {

    @Mock private RoadmapRepository roadmapRepository;
    @Mock private NivelDefinicionRepository nivelRepository;
    @Mock private GuardaCursoArchivado guardaCursoArchivado;

    private NivelesService service;

    private final UUID cc = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new NivelesService(roadmapRepository, nivelRepository, guardaCursoArchivado);
    }

    private void roadmapExiste() {
        RoadmapEntity r = new RoadmapEntity();
        r.setId(UUID.randomUUID());
        r.setCursoCohorteId(cc);
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cc)).thenReturn(Optional.of(r));
    }

    private NivelDefinicionEntity fila(String nombre, int umbral, int orden) {
        NivelDefinicionEntity e = new NivelDefinicionEntity();
        e.setCursoCohorteId(cc);
        e.setNombre(nombre);
        e.setUmbralXp(umbral);
        e.setOrden(orden);
        return e;
    }

    @Test
    void curvaVigente_sin_filas_custom_devuelve_par09() {
        roadmapExiste();
        when(nivelRepository.findByCursoCohorteIdAndActivoTrueOrderByOrdenAsc(cc)).thenReturn(List.of());

        assertThat(service.curvaVigente(cc).niveles()).hasSize(10);
    }

    @Test
    void curvaVigente_con_filas_custom_las_usa() {
        roadmapExiste();
        when(nivelRepository.findByCursoCohorteIdAndActivoTrueOrderByOrdenAsc(cc))
            .thenReturn(List.of(fila("Aprendiz", 0, 1), fila("Maestro", 500, 2)));

        List<Nivel> curva = service.curvaVigente(cc).niveles();

        assertThat(curva).extracting(Nivel::nombre).containsExactly("Aprendiz", "Maestro");
    }

    @Test
    void curvaVigente_curso_inexistente_es_404() {
        when(roadmapRepository.findByCursoCohorteIdAndActivoTrue(cc)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.curvaVigente(cc))
            .isInstanceOf(RoadmapNoEncontradoException.class);
    }

    @Test
    void definirCurva_da_de_baja_las_vigentes_e_inserta_la_nueva() {
        roadmapExiste();
        NivelDefinicionEntity vieja = fila("Viejo", 0, 1);
        when(nivelRepository.findByCursoCohorteIdAndActivoTrueOrderByOrdenAsc(cc)).thenReturn(List.of(vieja));

        service.definirCurva(cc, List.of(
            new CurvaNiveles.Definicion("Base", 0),
            new CurvaNiveles.Definicion("Pro", 300)
        ));

        assertThat(vieja.isActivo()).isFalse();
        verify(nivelRepository).saveAll(anyList());
        verify(nivelRepository, org.mockito.Mockito.times(2)).save(any(NivelDefinicionEntity.class));
    }

    @Test
    void definirCurva_invalida_no_toca_la_base() {
        roadmapExiste();

        assertThatThrownBy(() -> service.definirCurva(cc, List.of(
            new CurvaNiveles.Definicion("Sin cero", 100)
        ))).isInstanceOf(CurvaNivelesInvalidaException.class);

        verify(nivelRepository, never()).save(any());
        verify(nivelRepository, never()).saveAll(anyList());
    }

    @Test
    void definirCurva_curso_archivado_se_frena_en_la_guarda() {
        doThrow(new CursoArchivadoException(cc)).when(guardaCursoArchivado).exigirNoArchivado(cc);

        assertThatThrownBy(() -> service.definirCurva(cc, List.of(new CurvaNiveles.Definicion("Base", 0))))
            .isInstanceOf(CursoArchivadoException.class);

        verify(nivelRepository, never()).save(any());
    }
}
