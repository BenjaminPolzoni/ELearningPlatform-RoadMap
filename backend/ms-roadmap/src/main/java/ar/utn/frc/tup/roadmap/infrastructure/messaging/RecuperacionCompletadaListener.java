package ar.utn.frc.tup.roadmap.infrastructure.messaging;

import ar.utn.frc.tup.roadmap.application.usecase.ProcesarRecuperacionCompletadaCommand;
import ar.utn.frc.tup.roadmap.application.usecase.ProcesarRecuperacionCompletadaUseCase;
import ar.utn.frc.tup.roadmap.infrastructure.messaging.dto.RecuperacionCompletadaEventDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/** Camino 3 — ver {@code containerFactory} propio en {@code KafkaConsumerConfig}. */
@Slf4j
@Component
@RequiredArgsConstructor
public class RecuperacionCompletadaListener {

    private final ProcesarRecuperacionCompletadaUseCase useCase;

    @KafkaListener(
        topics = "${app.kafka.topics.recuperacion-completada:recuperacion-completada}",
        containerFactory = "recuperacionKafkaListenerContainerFactory"
    )
    public void escuchar(RecuperacionCompletadaEventDto evento) {
        log.info("RecuperacionCompletadaEvent recibido: alumno={} recuperacion={} resultado={}",
            evento.alumnoId(), evento.recuperacionId(), evento.resultado());

        useCase.procesar(new ProcesarRecuperacionCompletadaCommand(
            evento.eventoId(),
            evento.alumnoId(),
            evento.cursoCohorteId(),
            evento.recuperacionId(),
            evento.resultado() == RecuperacionCompletadaEventDto.Resultado.EXITO
        ));
    }
}
