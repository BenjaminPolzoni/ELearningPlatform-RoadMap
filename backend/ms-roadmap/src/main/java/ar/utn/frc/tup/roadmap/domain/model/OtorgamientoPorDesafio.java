package ar.utn.frc.tup.roadmap.domain.model;

/** Contexto de {@code TipoMovimientoXp.OTORGADO_DESAFIO} — usa PAR-01 según dificultad. */
public record OtorgamientoPorDesafio(Dificultad dificultad) implements ContextoMovimientoXp {
}
