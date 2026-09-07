package ar.utn.frc.tup.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * ⚠️ STAND-IN LOCAL DE DESARROLLO — no es el Gateway real de la plataforma.
 *
 * <p>El Tema 01 (Grupo del API Gateway) es dueño del Gateway real, con Spring Security
 * (validación de JWT vía JWKS), rate limiting, circuit breakers y el resto del pipeline
 * descrito en su propuesta de arquitectura (deck {@code idea.pptx}). Este Gateway local
 * solo implementa el RUTEO — lo mínimo para que el equipo pruebe el flujo completo
 * front → gateway → roadmap-service → postgres en su propia máquina.
 *
 * <p>NO hace: no valida JWT, no inyecta headers de identidad verificados, no aplica
 * rate limiting ni circuit breaker. Ver path/06-contrato-api.md §0 para el contrato
 * completo que el Gateway real sí cumple.
 */
@SpringBootApplication
public class GatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
}
