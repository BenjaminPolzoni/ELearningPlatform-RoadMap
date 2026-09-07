package ar.utn.frc.tup.roadmap.domain.model;

/**
 * Contexto de {@code AJUSTE_APELACION} y {@code AJUSTE_USO_IA} — el delta ya viene
 * calculado desde afuera (Evaluación LLM, RF-IA-18); acá no se recalcula nada, puede
 * ser negativo.
 */
public record AjusteManual(int delta) implements ContextoMovimientoXp {
}
