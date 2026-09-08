package ar.utn.frc.tup.roadmap.domain.port;

import ar.utn.frc.tup.roadmap.domain.model.Dificultad;

/**
 * Lo que el dominio necesita saber de Backoffice (Tema 12) — nunca hardcodeado (DoD §7).
 * El dominio conoce esta interfaz; NO conoce cómo se resuelve (HTTP vía Gateway hoy,
 * podría ser otra cosa mañana). Ver path/06-contrato-api.md §6.1 y §0.4 (token técnico).
 */
public interface LectorParametrosPort {

    /** PAR-01: XP base por desafío superado, según dificultad. */
    int xpBasePorDificultad(Dificultad dificultad);

    /** PAR-02: XP de un desafío personalizado por LLM (menor, sin monedas). */
    int xpDesafioPersonalizado();

    /** PAR-12: techo de vidas vigentes por curso (default de referencia: 3). */
    int techoVidas();
}
