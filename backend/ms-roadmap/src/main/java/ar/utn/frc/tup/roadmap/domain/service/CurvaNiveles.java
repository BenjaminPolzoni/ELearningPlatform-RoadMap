package ar.utn.frc.tup.roadmap.domain.service;

import ar.utn.frc.tup.roadmap.domain.exception.CurvaNivelesInvalidaException;
import ar.utn.frc.tup.roadmap.domain.model.Nivel;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Curva de niveles de un curso y la derivación nivel ← XP (RF-NIV-03/04/05, épica E6, núcleo).
 * Value object inmutable: se arma con {@link #de} (curva custom del profesor, RF-CFG-05) o
 * {@link #par09} (set por defecto del sistema). Dominio puro — sin Spring, sin JPA, se testea
 * con JUnit a secas.
 *
 * <p>Invariantes que impone {@link #de} (RF-NIV-04): entre 1 y 10 niveles, {@code umbral_xp}
 * estrictamente creciente, el primero en 0 (todo alumno con XP ≥ 0 tiene nivel). El
 * {@code orden} lo asigna la curva, 1..n por umbral ascendente — el cliente no lo manda.
 */
public final class CurvaNiveles {

    /**
     * PAR-09 — curva por defecto de 10 niveles. Los nombres son provisorios: RF-NIV-03 habla
     * de un "set predefinido del sistema" cuyos nombres la cátedra todavía no dio
     * (ver path/README.md §6). ponytail: "Nivel N" hasta que exista ese catálogo.
     */
    private static final int[] UMBRALES_PAR_09 = {0, 250, 600, 1100, 1800, 2800, 4200, 6000, 8500, 12000};

    public static final int MAX_NIVELES = 10;

    private final List<Nivel> niveles;

    private CurvaNiveles(List<Nivel> niveles) {
        this.niveles = List.copyOf(niveles);
    }

    /** Curva por defecto del sistema (PAR-09), la que rige mientras el profesor no defina una. */
    public static CurvaNiveles par09() {
        List<Definicion> defs = new ArrayList<>(UMBRALES_PAR_09.length);
        for (int i = 0; i < UMBRALES_PAR_09.length; i++) {
            defs.add(new Definicion("Nivel " + (i + 1), UMBRALES_PAR_09[i]));
        }
        return de(defs);
    }

    /** Construye y valida una curva custom. El input puede venir desordenado: se ordena por umbral. */
    public static CurvaNiveles de(List<Definicion> definiciones) {
        if (definiciones == null || definiciones.isEmpty()) {
            throw new CurvaNivelesInvalidaException("la curva de niveles no puede estar vacía");
        }
        if (definiciones.size() > MAX_NIVELES) {
            throw new CurvaNivelesInvalidaException(
                "máximo " + MAX_NIVELES + " niveles por curso (RF-NIV-04), llegaron " + definiciones.size());
        }
        List<Definicion> ordenadas = definiciones.stream()
            .sorted(Comparator.comparingInt(Definicion::umbralXp))
            .toList();
        if (ordenadas.get(0).umbralXp() != 0) {
            throw new CurvaNivelesInvalidaException("el primer nivel debe tener umbral_xp = 0");
        }

        List<Nivel> construidos = new ArrayList<>(ordenadas.size());
        int previo = -1;
        for (int i = 0; i < ordenadas.size(); i++) {
            Definicion d = ordenadas.get(i);
            if (d.umbralXp() <= previo) {
                throw new CurvaNivelesInvalidaException(
                    "los umbral_xp deben ser estrictamente crecientes — " + d.umbralXp() + " no supera a " + previo);
            }
            previo = d.umbralXp();
            construidos.add(new Nivel(d.nombre(), d.umbralXp(), i + 1));
        }
        return new CurvaNiveles(construidos);
    }

    /** RF-NIV-05: el nivel es el último de la curva cuyo umbral el alumno ya alcanzó. */
    public Nivel nivelPara(int xpTotal) {
        Nivel actual = niveles.get(0);
        for (Nivel n : niveles) {
            if (xpTotal >= n.umbralXp()) {
                actual = n;
            } else {
                break;
            }
        }
        return actual;
    }

    public List<Nivel> niveles() {
        return niveles;
    }

    /** Par (nombre, umbral) que propone el profesor — el {@code orden} lo pone la curva. */
    public record Definicion(String nombre, int umbralXp) {}
}
