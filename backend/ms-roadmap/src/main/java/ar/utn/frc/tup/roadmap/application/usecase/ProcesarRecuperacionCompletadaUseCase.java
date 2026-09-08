package ar.utn.frc.tup.roadmap.application.usecase;

import ar.utn.frc.tup.roadmap.domain.model.TipoMovimientoVida;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.EventoProcesadoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.MovimientoVidaEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.EventoProcesadoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.MovimientoVidaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Camino 3, segunda mitad. Reglas de RF-REC-04, deliberadamente distintas del nodo normal:
 * <ul>
 *   <li>Éxito → otorga EXACTAMENTE 1 vida (nunca XP — a diferencia de un nodo del mapa).</li>
 *   <li>Fallo → no pasa NADA acá: no resta vida, no hay límite de reintentos. El bucle
 *       ("reintentable sin límite") lo sostiene el Motor de Desafíos, no nosotros — este
 *       use case simplemente no tiene ninguna acción que tomar en ese caso.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ProcesarRecuperacionCompletadaUseCase {

    private final EventoProcesadoRepository eventoProcesadoRepository;
    private final MovimientoVidaRepository movimientoVidaRepository;

    public void procesar(ProcesarRecuperacionCompletadaCommand cmd) {
        if (eventoProcesadoRepository.existsById(cmd.origenEventoId())) {
            log.info("Evento {} ya procesado, se ignora (reintento del bus)", cmd.origenEventoId());
            return;
        }

        if (cmd.exito()) {
            MovimientoVidaEntity movimiento = new MovimientoVidaEntity();
            movimiento.setAlumnoId(cmd.alumnoId());
            movimiento.setCursoCohorteId(cmd.cursoCohorteId());
            movimiento.setDesafioRecuperacionId(cmd.recuperacionId());
            movimiento.setTipo(TipoMovimientoVida.RECUPERADA);
            movimiento.setOrigenEventoId(cmd.origenEventoId());
            movimientoVidaRepository.save(movimiento);
        }
        // Fallo: nada que hacer — ver el javadoc de la clase.

        EventoProcesadoEntity marca = new EventoProcesadoEntity();
        marca.setOrigenEventoId(cmd.origenEventoId());
        eventoProcesadoRepository.save(marca);
    }
}
