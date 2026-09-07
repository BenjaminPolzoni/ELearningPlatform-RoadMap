package ar.utn.frc.tup.roadmap.infrastructure.client;

import ar.utn.frc.tup.roadmap.domain.model.Dificultad;
import ar.utn.frc.tup.roadmap.domain.port.LectorParametrosPort;
import org.springframework.stereotype.Component;

/**
 * ⚠️ STUB — Backoffice (Tema 12) todavía no existe. Devuelve los valores de referencia
 * documentados en path/README.md §3.6, NO los reales (esos los administra ADMIN en
 * runtime, nunca hardcodeados — DoD §7).
 *
 * <p>TODO Fase 3: reemplazar por un adapter con {@code WebClient} que llama al Gateway
 * con token técnico ({@code aud=backoffice-service}, {@code scope=backoffice.params.read} —
 * ver path/06-contrato-api.md §0.4 y §6.1), con cache de TTL corto y degradación
 * controlada si Backoffice no responde (RF-NFR-04): usar el último valor cacheado, nunca
 * un default silencioso distinto de este.
 */
@Component
public class LectorParametrosStubAdapter implements LectorParametrosPort {

    @Override
    public int xpBasePorDificultad(Dificultad dificultad) {
        return switch (dificultad) {
            case BASICO -> 100;
            case MEDIO -> 250;
            case AVANZADO -> 500;
        };
    }

    @Override
    public int xpDesafioPersonalizado() {
        // PAR-02: "menor, solo XP sin monedas" — no hay un valor de referencia documentado
        // todavía. Placeholder explícito, no una suposición disfrazada de dato real.
        return 30;
    }
}
