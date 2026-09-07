package ar.utn.frc.tup.roadmap.domain.service;

import ar.utn.frc.tup.roadmap.domain.model.EstadoNodo;

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
}
