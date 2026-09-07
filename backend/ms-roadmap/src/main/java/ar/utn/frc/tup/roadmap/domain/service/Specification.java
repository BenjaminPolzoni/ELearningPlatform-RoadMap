package ar.utn.frc.tup.roadmap.domain.service;

/**
 * Specification: una regla de negocio como objeto, combinable con {@code y}/{@code o}/{@code negar}
 * en vez de un {@code if} con varias condiciones pegadas. Cada regla se nombra, se testea
 * sola, y la regla compuesta se lee como la frase del RF que la originó.
 */
@FunctionalInterface
public interface Specification<T> {

    boolean cumple(T candidato);

    default Specification<T> y(Specification<T> otra) {
        return candidato -> this.cumple(candidato) && otra.cumple(candidato);
    }

    default Specification<T> o(Specification<T> otra) {
        return candidato -> this.cumple(candidato) || otra.cumple(candidato);
    }

    default Specification<T> negar() {
        return candidato -> !this.cumple(candidato);
    }
}
