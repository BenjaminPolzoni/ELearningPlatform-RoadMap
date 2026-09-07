package ar.utn.frc.tup.eureka;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;

/**
 * ⚠️ STAND-IN LOCAL DE DESARROLLO — no es la infraestructura real de la plataforma.
 *
 * <p>El Tema 01 (Grupo del API Gateway) es dueño del Eureka/Gateway reales de toda la
 * plataforma. Este servidor Eureka solo existe para que {@code roadmap-service} tenga
 * dónde registrarse y el equipo pueda levantar y probar el stack completo en su propia
 * máquina sin depender de que el Tema 01 tenga su infraestructura corriendo.
 * Se reemplaza en integración. Ver path/06-contrato-api.md §0.
 */
@EnableEurekaServer
@SpringBootApplication
public class EurekaServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(EurekaServerApplication.class, args);
    }
}
