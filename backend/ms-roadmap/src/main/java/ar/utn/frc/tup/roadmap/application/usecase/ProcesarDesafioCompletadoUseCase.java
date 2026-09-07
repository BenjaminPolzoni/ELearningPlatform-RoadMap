package ar.utn.frc.tup.roadmap.application.usecase;

import ar.utn.frc.tup.roadmap.domain.exception.NodoNoEncontradoException;
import ar.utn.frc.tup.roadmap.domain.model.EstadoNodo;
import ar.utn.frc.tup.roadmap.domain.model.OtorgamientoPorDesafio;
import ar.utn.frc.tup.roadmap.domain.model.TipoMovimientoVida;
import ar.utn.frc.tup.roadmap.domain.model.TipoMovimientoXp;
import ar.utn.frc.tup.roadmap.domain.model.TipoNodo;
import ar.utn.frc.tup.roadmap.domain.service.MotorVidas;
import ar.utn.frc.tup.roadmap.domain.service.MotorXp;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.EventoProcesadoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.MovimientoVidaEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.MovimientoXpEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.ProgresoNodoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapNodoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.EventoProcesadoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.MovimientoVidaRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.MovimientoXpRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.ProgresoNodoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapNodoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Camino 1 (éxito) y Camino 2 (fallo) del BPMN de Roadmap — el flujo central de todo
 * el módulo. Orquesta lo que los motores de dominio deciden; no decide nada él mismo.
 *
 * <p>Lo que NO hace todavía, a propósito:
 * <ul>
 *   <li>No evalúa desbloqueo de la siguiente sección (falta resolver cómo se inicializan
 *       las primeras filas de {@code ProgresoNodo} de una sección recién desbloqueada —
 *       duda abierta, ver path/README.md §6).</li>
 *   <li>No maneja nodos {@code RECUPERACION} (Camino 3, RF-REC-04 tiene reglas distintas:
 *       otorga vida en vez de XP, nunca resta vida) — rechaza el evento explícitamente
 *       en vez de aplicarles mal las reglas de un nodo normal.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ProcesarDesafioCompletadoUseCase {

    private final EventoProcesadoRepository eventoProcesadoRepository;
    private final RoadmapNodoRepository nodoRepository;
    private final ProgresoNodoRepository progresoRepository;
    private final MovimientoXpRepository movimientoXpRepository;
    private final MovimientoVidaRepository movimientoVidaRepository;
    private final MotorXp motorXp;
    private final MotorVidas motorVidas;

    public void procesar(ProcesarDesafioCompletadoCommand cmd) {
        // 1. Idempotencia — gate único, antes de decidir nada (patrón Inbox).
        if (eventoProcesadoRepository.existsById(cmd.origenEventoId())) {
            log.info("Evento {} ya procesado, se ignora (reintento del bus)", cmd.origenEventoId());
            return;
        }

        RoadmapNodoEntity nodo = nodoRepository.findById(cmd.nodoId())
            .filter(RoadmapNodoEntity::isActivo)
            .orElseThrow(() -> new NodoNoEncontradoException(cmd.nodoId()));

        if (nodo.getTipo() == TipoNodo.RECUPERACION) {
            throw new IllegalStateException(
                "Nodo " + cmd.nodoId() + " es RECUPERACION — RF-REC-04 tiene reglas propias "
                    + "(Camino 3, no implementado). No se procesa con las reglas de un nodo normal.");
        }

        ProgresoNodoEntity progreso = progresoRepository.findByAlumnoIdAndNodoId(cmd.alumnoId(), cmd.nodoId())
            .orElseGet(() -> nuevoProgreso(cmd));

        if (cmd.exito()) {
            procesarExito(cmd, progreso);
        } else {
            procesarFallo(cmd, nodo, progreso);
        }

        progresoRepository.save(progreso);

        EventoProcesadoEntity marca = new EventoProcesadoEntity();
        marca.setOrigenEventoId(cmd.origenEventoId());
        eventoProcesadoRepository.save(marca);
    }

    private void procesarExito(ProcesarDesafioCompletadoCommand cmd, ProgresoNodoEntity progreso) {
        // State: si el nodo estaba BLOQUEADO (nunca se le creó progreso habilitado),
        // esto explota con TransicionInvalidaException — correcto: no debería llegar un
        // "éxito" para un nodo que el alumno nunca pudo empezar.
        progreso.setEstado(progreso.getEstado().alCompletar());
        progreso.setCompletadoEn(java.time.Instant.now());

        // Strategy: el monto lo decide MotorXp según el tipo de movimiento.
        int monto = motorXp.calcularMonto(
            TipoMovimientoXp.OTORGADO_DESAFIO,
            new OtorgamientoPorDesafio(cmd.dificultad())
        );

        MovimientoXpEntity movimiento = new MovimientoXpEntity();
        movimiento.setAlumnoId(cmd.alumnoId());
        movimiento.setCursoCohorteId(cmd.cursoCohorteId());
        movimiento.setNodoId(cmd.nodoId());
        movimiento.setTipo(TipoMovimientoXp.OTORGADO_DESAFIO);
        movimiento.setMonto(monto);
        movimiento.setOrigenEventoId(cmd.origenEventoId());
        movimientoXpRepository.save(movimiento);

        // TODO Fase 2: MotorDesbloqueo.debeDesbloquear(xpAcumuladoEnSeccion, umbral) acá.
    }

    private void procesarFallo(
        ProcesarDesafioCompletadoCommand cmd, RoadmapNodoEntity nodo, ProgresoNodoEntity progreso
    ) {
        progreso.setIntentosUsados(progreso.getIntentosUsados() + 1);

        // RF-DES-07: "1 intento inicial + los reintentos configurados por el profesor".
        boolean quedanReintentos = progreso.getIntentosUsados() <= 1 + nodo.getReintentosPermitidos();

        // State: HABILITADO->HABILITADO (gratis), HABILITADO->FALLADO o FALLADO->FALLADO (paga).
        EstadoNodo estadoResultante = progreso.getEstado().alFallar(quedanReintentos);
        progreso.setEstado(estadoResultante);

        if (motorVidas.correspondeDescontarVida(estadoResultante, false)) {
            MovimientoVidaEntity movimiento = new MovimientoVidaEntity();
            movimiento.setAlumnoId(cmd.alumnoId());
            movimiento.setCursoCohorteId(cmd.cursoCohorteId());
            movimiento.setNodoId(cmd.nodoId());
            movimiento.setTipo(TipoMovimientoVida.PERDIDA);
            movimiento.setOrigenEventoId(cmd.origenEventoId());
            movimientoVidaRepository.save(movimiento);
        }
    }

    private ProgresoNodoEntity nuevoProgreso(ProcesarDesafioCompletadoCommand cmd) {
        // TODO: esto asume que "no existe fila" == BLOQUEADO por default de la entidad.
        // No resuelve CÓMO se crean las primeras filas en HABILITADO cuando una sección
        // se desbloquea — esa es la duda de bootstrapping de path/README.md §6.
        ProgresoNodoEntity nuevo = new ProgresoNodoEntity();
        nuevo.setAlumnoId(cmd.alumnoId());
        nuevo.setCursoCohorteId(cmd.cursoCohorteId());
        nuevo.setNodoId(cmd.nodoId());
        return nuevo;
    }
}
