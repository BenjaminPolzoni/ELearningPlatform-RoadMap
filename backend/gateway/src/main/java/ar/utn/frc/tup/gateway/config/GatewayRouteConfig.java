package ar.utn.frc.tup.gateway.config;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Ruteo ESTÁTICO, a propósito — es más simple y predecible que reproducir el discovery
 * locator dinámico con {@code include-expression} del deck del Tema 01 (slide 24) para un
 * stand-in que solo necesita exponer UN servicio local. Sigue el mismo principio de fondo
 * — allowlist explícita, nada se expone por accidente — sin la maquinaria dinámica que
 * no aporta nada cuando el equipo real de infraestructura ya la tiene resuelta.
 *
 * <p>{@code roadmap-service} es el único admitido: mismo espíritu que "Agregar un micro =
 * nombre válido + opt-in" del deck (slide 24) — acá el opt-in es esta clase, no una
 * expresión de configuración dinámica.
 */
@Configuration
public class GatewayRouteConfig {

    @Bean
    public RouteLocator routes(RouteLocatorBuilder builder) {
        return builder.routes()
            .route("roadmap-service", r -> r
                .path("/api/roadmap/**")
                .uri("lb://ROADMAP-SERVICE"))
            .build();
    }
}
