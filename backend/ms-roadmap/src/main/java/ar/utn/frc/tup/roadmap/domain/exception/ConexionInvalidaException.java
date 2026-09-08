package ar.utn.frc.tup.roadmap.domain.exception;

/**
 * La conexión pedida no puede existir en un grafo de prerequisitos bien formado:
 * un nodo prerequisito de sí mismo (auto-lazo), un nodo que no pertenece a este
 * roadmap, o una arista que cerraría un ciclo (A→B→…→A) — un ciclo dejaría a esos
 * nodos imposibles de desbloquear entre ellos. Contrato §0.5 → 400.
 */
public class ConexionInvalidaException extends RuntimeException {

    public ConexionInvalidaException(String motivo) {
        super(motivo);
    }
}
