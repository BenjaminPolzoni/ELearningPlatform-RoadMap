package ar.utn.frc.tup.roadmap.infrastructure.config;

import ar.utn.frc.tup.roadmap.infrastructure.messaging.dto.AlumnoInscriptoEventDto;
import ar.utn.frc.tup.roadmap.infrastructure.messaging.dto.CursoArchivadoEventDto;
import ar.utn.frc.tup.roadmap.infrastructure.messaging.dto.RecuperacionCompletadaEventDto;
import java.util.HashMap;
import java.util.Map;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.support.serializer.ErrorHandlingDeserializer;
import org.springframework.kafka.support.serializer.JsonDeserializer;

/**
 * Resuelve la deuda anotada en path/deuda-tecnica/tarea-deuda-06-contrato-api.md #3:
 * {@code spring.json.value.default.type} en application.yml solo alcanza para UN tipo de
 * evento en la ConsumerFactory autoconfigurada (la usa {@code DesafioCompletadoListener}).
 * Cada listener extra trae su factory nombrada acá — nunca se toca la autoconfigurada.
 */
@Configuration
public class KafkaConsumerConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    /** Props comunes de todos los consumers propios, con el tipo de valor por defecto ya fijado. */
    private Map<String, Object> baseProps(Class<?> valueDefaultType) {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "roadmap-service");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
        props.put(ErrorHandlingDeserializer.VALUE_DESERIALIZER_CLASS, JsonDeserializer.class.getName());
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "ar.utn.frc.tup.roadmap.infrastructure.messaging.dto");
        props.put(JsonDeserializer.VALUE_DEFAULT_TYPE, valueDefaultType.getName());
        return props;
    }

    private <T> ConcurrentKafkaListenerContainerFactory<String, T> factory(ConsumerFactory<String, T> cf) {
        ConcurrentKafkaListenerContainerFactory<String, T> f = new ConcurrentKafkaListenerContainerFactory<>();
        f.setConsumerFactory(cf);
        return f;
    }

    // ── Camino 3: RecuperacionCompletadaEvent ────────────────────────────

    @Bean
    public ConsumerFactory<String, RecuperacionCompletadaEventDto> recuperacionConsumerFactory() {
        return new DefaultKafkaConsumerFactory<>(baseProps(RecuperacionCompletadaEventDto.class));
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, RecuperacionCompletadaEventDto>
            recuperacionKafkaListenerContainerFactory(
        ConsumerFactory<String, RecuperacionCompletadaEventDto> recuperacionConsumerFactory
    ) {
        return factory(recuperacionConsumerFactory);
    }

    // ── Camino 6: CursoArchivadoEvent ───────────────────────────────────

    @Bean
    public ConsumerFactory<String, CursoArchivadoEventDto> cursoArchivadoConsumerFactory() {
        return new DefaultKafkaConsumerFactory<>(baseProps(CursoArchivadoEventDto.class));
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, CursoArchivadoEventDto>
            cursoArchivadoKafkaListenerContainerFactory(
        ConsumerFactory<String, CursoArchivadoEventDto> cursoArchivadoConsumerFactory
    ) {
        return factory(cursoArchivadoConsumerFactory);
    }

    // ── Bootstrapping (README §6.8): AlumnoInscriptoEvent ───────────────

    @Bean
    public ConsumerFactory<String, AlumnoInscriptoEventDto> alumnoInscriptoConsumerFactory() {
        return new DefaultKafkaConsumerFactory<>(baseProps(AlumnoInscriptoEventDto.class));
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, AlumnoInscriptoEventDto>
            alumnoInscriptoKafkaListenerContainerFactory(
        ConsumerFactory<String, AlumnoInscriptoEventDto> alumnoInscriptoConsumerFactory
    ) {
        return factory(alumnoInscriptoConsumerFactory);
    }
}
