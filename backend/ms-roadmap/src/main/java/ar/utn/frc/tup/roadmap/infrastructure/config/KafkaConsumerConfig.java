package ar.utn.frc.tup.roadmap.infrastructure.config;

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
 * Este segundo listener ({@code RecuperacionCompletadaListener}) necesita la suya propia
 * — el próximo evento (ej. {@code CursoArchivadoEvent}) sigue el mismo patrón: una
 * factory nombrada más acá, no tocar la autoconfigurada.
 */
@Configuration
public class KafkaConsumerConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Bean
    public ConsumerFactory<String, RecuperacionCompletadaEventDto> recuperacionConsumerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "roadmap-service");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
        props.put(ErrorHandlingDeserializer.VALUE_DESERIALIZER_CLASS, JsonDeserializer.class.getName());
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "ar.utn.frc.tup.roadmap.infrastructure.messaging.dto");
        props.put(JsonDeserializer.VALUE_DEFAULT_TYPE, RecuperacionCompletadaEventDto.class.getName());
        return new DefaultKafkaConsumerFactory<>(props);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, RecuperacionCompletadaEventDto>
            recuperacionKafkaListenerContainerFactory(
        ConsumerFactory<String, RecuperacionCompletadaEventDto> recuperacionConsumerFactory
    ) {
        ConcurrentKafkaListenerContainerFactory<String, RecuperacionCompletadaEventDto> factory =
            new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(recuperacionConsumerFactory);
        return factory;
    }
}
