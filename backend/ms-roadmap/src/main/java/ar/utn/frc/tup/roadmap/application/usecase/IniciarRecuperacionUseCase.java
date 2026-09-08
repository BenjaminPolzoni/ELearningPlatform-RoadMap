package ar.utn.frc.tup.roadmap.application.usecase;

import ar.utn.frc.tup.roadmap.domain.exception.PoolRecuperacionVacioException;
import ar.utn.frc.tup.roadmap.domain.exception.RecuperacionNoCorrespondeException;
import ar.utn.frc.tup.roadmap.domain.model.TipoMovimientoVida;
import ar.utn.frc.tup.roadmap.domain.port.LectorParametrosPort;
import ar.utn.frc.tup.roadmap.domain.service.MotorVidas;
import ar.utn.frc.tup.roadmap.domain.service.SelectorRecuperacion;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.DesafioRecuperacionEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.MovimientoVidaEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.DesafioRecuperacionRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.MovimientoVidaRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Camino 3 del BPMN, primera mitad — POST /alumnos/{aid}/vidas/recuperacion.
 * Solo ASIGNA cuál desafío intentar; no persiste nada de esta llamada (RF-REC-04: el
 * desafío en sí lo ejecuta el Motor de Desafíos). El registro pasa cuando llega el
 * resultado — ver {@link ProcesarRecuperacionCompletadaUseCase}.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class IniciarRecuperacionUseCase {

    private final MovimientoVidaRepository movimientoVidaRepository;
    private final DesafioRecuperacionRepository desafioRecuperacionRepository;
    private final LectorParametrosPort lectorParametros;
    private final MotorVidas motorVidas;
    private final SelectorRecuperacion selectorRecuperacion;

    public UUID iniciar(UUID alumnoId, UUID cursoCohorteId) {
        List<TipoMovimientoVida> movimientos = movimientoVidaRepository
            .findByAlumnoIdAndCursoCohorteIdOrderByRegistradoEnAsc(alumnoId, cursoCohorteId)
            .stream().map(MovimientoVidaEntity::getTipo).toList();

        int vidasVigentes = motorVidas.calcularVidasVigentes(movimientos, lectorParametros.techoVidas());
        if (vidasVigentes > 0) {
            throw new RecuperacionNoCorrespondeException(alumnoId, vidasVigentes);
        }

        List<DesafioRecuperacionEntity> pool =
            desafioRecuperacionRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId);
        if (pool.isEmpty()) {
            throw new PoolRecuperacionVacioException(cursoCohorteId);
        }

        List<UUID> poolIds = pool.stream().map(DesafioRecuperacionEntity::getId).toList();
        List<UUID> resueltosIds = movimientoVidaRepository.findDesafiosRecuperacionResueltos(
            alumnoId, cursoCohorteId, TipoMovimientoVida.RECUPERADA
        );

        UUID recuperacionElegidaId = selectorRecuperacion.elegir(poolIds, resueltosIds);

        // El alumno pide un desafíoId concreto para resolver, no un id interno nuestro.
        return pool.stream()
            .filter(d -> d.getId().equals(recuperacionElegidaId))
            .findFirst()
            .map(DesafioRecuperacionEntity::getDesafioId)
            .orElseThrow(); // imposible: recuperacionElegidaId viene de poolIds
    }
}
