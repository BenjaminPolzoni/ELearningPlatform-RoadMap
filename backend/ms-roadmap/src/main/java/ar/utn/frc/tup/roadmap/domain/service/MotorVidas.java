package ar.utn.frc.tup.roadmap.domain.service;

import ar.utn.frc.tup.roadmap.domain.model.EstadoNodo;
import ar.utn.frc.tup.roadmap.domain.model.TipoMovimientoVida;
import java.util.List;

/**
 * RF-DES-07: se descuenta 1 vida cuando (y solo cuando) el nodo termina en FALLADO —
 * tanto la primera vez que se agotan los reintentos como cualquier fallo posterior,
 * porque {@link EstadoNodo#alFallar} ya encapsula esa regla en la transición misma
 * (FALLADO -&gt; FALLADO sigue costando). Acá no se reimplementa esa lógica, solo se lee
 * el resultado — evita tener la misma regla escrita en dos lugares.
 */
public class MotorVidas {

    public boolean correspondeDescontarVida(EstadoNodo estadoResultante, boolean esDesafioPersonalizado) {
        // Los desafíos personalizados por LLM nunca consumen vidas, sin importar el estado.
        if (esDesafioPersonalizado) {
            return false;
        }
        return estadoResultante == EstadoNodo.FALLADO;
    }

    /**
     * {@code vidas_vigentes}: suma y resta según el historial, con techo PAR-12 aplicado
     * en CADA paso (no solo al final) — si el alumno ya está en el techo, recuperar o
     * comprar una vida de más no la hace acumular por encima de él. Nunca negativo.
     *
     * <p>Recibe los movimientos YA ordenados cronológicamente — el orden lo decide quien
     * los lee de la base (ver {@code MovimientoVidaRepository}), no este método.
     */
    public int calcularVidasVigentes(List<TipoMovimientoVida> movimientosOrdenados, int techo) {
        int vidas = 0;
        for (TipoMovimientoVida tipo : movimientosOrdenados) {
            vidas += switch (tipo) {
                case INICIAL, RECUPERADA, COMPRADA -> 1;
                case PERDIDA -> -1;
            };
            vidas = Math.clamp(vidas, 0, techo);
        }
        return vidas;
    }
}
