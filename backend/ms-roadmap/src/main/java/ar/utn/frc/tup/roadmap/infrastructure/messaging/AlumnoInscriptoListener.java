package ar.utn.frc.tup.roadmap.infrastructure.messaging;

import ar.utn.frc.tup.roadmap.application.usecase.ProcesarAlumnoInscriptoUseCase;
import ar.utn.frc.tup.roadmap.infrastructure.messaging.dto.AlumnoInscriptoEventDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/** Bootstrapping README §6.8 — ver {@code containerFactory} propio en {@code KafkaConsumerConfig}. */
@Slf4j
@Component
@RequiredArgsConstructor
public class AlumnoInscriptoListener {

    private final ProcesarAlumnoInscriptoUseCase useCase;

    @KafkaListener(
        topics = "${app.kafka.topics.alumno-inscripto:alumno-inscripto}",
        containerFactory = "alumnoInscriptoKafkaListenerContainerFactory"
    )
    public void escuchar(AlumnoInscriptoEventDto evento) {
        log.info("AlumnoInscriptoEvent recibido: alumno={} curso={}",
            evento.alumnoId(), evento.cursoCohorteId());
        useCase.procesar(evento.eventoId(), evento.alumnoId(), evento.cursoCohorteId());
    }
}
