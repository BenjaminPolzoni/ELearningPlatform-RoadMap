package ar.utn.frc.tup.roadmap;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Smoke test de arranque completo — necesita Postgres real alcanzable (valida Flyway +
 * que Hibernate matchea las entidades contra el esquema de verdad, {@code ddl-auto: validate}).
 *
 * <p>Convención {@code *IT} a propósito: Surefire (fase {@code test}) NO la recoge por
 * default, así que {@code mvn test} da verde sin necesitar infraestructura. Para correrla:
 * {@code docker compose up -d postgres eureka} y después {@code mvn -Dtest=MsRoadmapApplicationIT test}.
 *
 * <p>TODO Fase 1: bindear maven-failsafe-plugin a las fases integration-test/verify para
 * que {@code mvn verify} la corra automáticamente contra la infra levantada por CI.
 */
@SpringBootTest
class MsRoadmapApplicationIT {

    @Test
    void contextLoads() {
    }
}
