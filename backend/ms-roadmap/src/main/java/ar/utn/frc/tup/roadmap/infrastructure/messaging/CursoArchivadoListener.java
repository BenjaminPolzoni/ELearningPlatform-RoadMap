package ar.utn.frc.tup.roadmap.infrastructure.messaging;

import ar.utn.frc.tup.roadmap.application.usecase.ProcesarCursoArchivadoUseCase;
import ar.utn.frc.tup.roadmap.infrastructure.messaging.dto.CursoArchivadoEventDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/** Camino 6 — ver {@code containerFactory} propio en {@code KafkaConsumerConfig}. */
@Slf4j
@Component
@RequiredArgsConstructor
public class CursoArchivadoListener {

    private final ProcesarCursoArchivadoUseCase useCase;

    @KafkaListener(
        topics = "${app.kafka.topics.curso-archivado:curso-archivado}",
        containerFactory = "cursoArchivadoKafkaListenerContainerFactory"
    )
    public void escuchar(CursoArchivadoEventDto evento) {
        log.info("CursoArchivadoEvent recibido: curso={}", evento.cursoCohorteId());
        useCase.procesar(evento.eventoId(), evento.cursoCohorteId(), evento.inscriptosActivos());
    }
}
