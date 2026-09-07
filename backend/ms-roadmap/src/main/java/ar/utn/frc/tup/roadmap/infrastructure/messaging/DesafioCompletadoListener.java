package ar.utn.frc.tup.roadmap.infrastructure.messaging;

import ar.utn.frc.tup.roadmap.application.usecase.ProcesarDesafioCompletadoCommand;
import ar.utn.frc.tup.roadmap.application.usecase.ProcesarDesafioCompletadoUseCase;
import ar.utn.frc.tup.roadmap.infrastructure.messaging.dto.DesafioCompletadoEventDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Adapter de entrada: traduce el DTO de Kafka al comando del use case. Es la ÚNICA clase
 * que sabe que esto llegó por Kafka — si mañana cambia el transporte, el use case no se
 * entera.
 *
 * <p>Nombre del tópico sin confirmar — ver {@code DesafioCompletadoEventDto} — placeholder
 * configurable hasta que el Tema 11 publique el contrato real de eventos.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DesafioCompletadoListener {

    private final ProcesarDesafioCompletadoUseCase useCase;

    @KafkaListener(topics = "${app.kafka.topics.desafio-completado:desafio-completado}")
    public void escuchar(DesafioCompletadoEventDto evento) {
        log.info("DesafioCompletadoEvent recibido: alumno={} nodo={} resultado={}",
            evento.alumnoId(), evento.nodoId(), evento.resultado());

        useCase.procesar(new ProcesarDesafioCompletadoCommand(
            evento.eventoId(),
            evento.alumnoId(),
            evento.cursoCohorteId(),
            evento.nodoId(),
            evento.resultado() == DesafioCompletadoEventDto.Resultado.EXITO,
            evento.dificultad()
        ));
    }
}
