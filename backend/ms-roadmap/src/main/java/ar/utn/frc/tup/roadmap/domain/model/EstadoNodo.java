package ar.utn.frc.tup.roadmap.domain.model;

import ar.utn.frc.tup.roadmap.domain.exception.TransicionInvalidaException;

/**
 * Máquina de estados del nodo — patrón State, con Java idiomático: cada constante del enum
 * sabe a qué estado transiciona y cuáles transiciones tiene prohibidas (las hereda del
 * default y explota). Ver el diagrama en path/02-modelo-de-datos.md §5:
 *
 * <pre>
 * [*] -&gt; BLOQUEADO
 * BLOQUEADO  -&gt; HABILITADO : XP acumulado en la sección &gt;= umbral_xp_desbloqueo
 * HABILITADO -&gt; COMPLETADO : DesafioCompletadoEvent (éxito)
 * HABILITADO -&gt; HABILITADO : fallo, quedan reintentos
 * HABILITADO -&gt; FALLADO    : fallo, reintentos agotados -&gt; descuenta 1 vida
 * FALLADO    -&gt; COMPLETADO : DesafioCompletadoEvent (éxito) — se puede seguir intentando
 * FALLADO    -&gt; FALLADO    : fallo otra vez -&gt; descuenta 1 vida de nuevo, sin más "gratis"
 * COMPLETADO -&gt; [*]         (estado terminal)
 * </pre>
 *
 * <p><b>FALLADO es un estado del NODO, no del alumno.</b> No existe transición
 * {@code FALLADO -> HABILITADO}: una versión anterior de este enum la tenía (calcada de un
 * diagrama que quedó desactualizado — ver la nota de corrección en 02-modelo-de-datos.md
 * §5), pero contradecía la regla ya cerrada con la cátedra de que el nodo "nunca queda
 * bloqueado por sí mismo" — el alumno simplemente sigue intentando (y pagando 1 vida por
 * intento) sin volver a HABILITADO primero. Que el alumno se quede sin vidas y necesite
 * recuperar una (RF-REC-04) es un gate aparte, a nivel alumno, que NO se modela acá.
 *
 * <p>Por qué enum-con-comportamiento y no una clase {@code MaquinaEstadoNodo} externa con
 * un switch: acá el estado ES el objeto que sabe transicionar — evita el "switch disperso"
 * típico cuando la lógica de transición vive afuera, y hace que un estado nuevo mal cableado
 * sea un error de compilación (falta implementar el método), no un bug en runtime. De hecho,
 * escribir esto como transiciones explícitas fue lo que hizo evidente la inconsistencia de
 * la versión anterior — en prosa quedaba disimulada.
 */
public enum EstadoNodo {

    BLOQUEADO {
        @Override
        public EstadoNodo alHabilitar() {
            return HABILITADO;
        }
    },

    HABILITADO {
        @Override
        public EstadoNodo alCompletar() {
            return COMPLETADO;
        }

        @Override
        public EstadoNodo alFallar(boolean quedanReintentos) {
            return quedanReintentos ? HABILITADO : FALLADO;
        }
    },

    COMPLETADO {
        // Estado terminal — todas las transiciones caen en el default (explotan).
    },

    FALLADO {
        @Override
        public EstadoNodo alCompletar() {
            return COMPLETADO;
        }

        @Override
        public EstadoNodo alFallar(boolean quedanReintentos) {
            // Ya no hay reintentos "gratis" que consultar — esa cuenta se gastó para
            // llegar acá. De ahora en más, cada fallo cuesta 1 vida (MotorVidas lo
            // decide mirando que el estado resultante sea FALLADO), sin importar el
            // valor de quedanReintentos.
            return FALLADO;
        }
    };

    /** XP acumulado de la sección superó el umbral (RF-CUR-06). */
    public EstadoNodo alHabilitar() {
        throw new TransicionInvalidaException(this, "habilitar");
    }

    /** DesafioCompletadoEvent con resultado de éxito. */
    public EstadoNodo alCompletar() {
        throw new TransicionInvalidaException(this, "completar");
    }

    /**
     * DesafioCompletadoEvent con resultado de fallo.
     * @param quedanReintentos true si {@code intentos_usados <= 1 + reintentos_permitidos} (RF-DES-07)
     */
    public EstadoNodo alFallar(boolean quedanReintentos) {
        throw new TransicionInvalidaException(this, "fallar");
    }
}
