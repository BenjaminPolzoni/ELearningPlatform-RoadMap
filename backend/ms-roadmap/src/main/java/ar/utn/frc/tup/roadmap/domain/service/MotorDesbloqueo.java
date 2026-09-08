package ar.utn.frc.tup.roadmap.domain.service;

import ar.utn.frc.tup.roadmap.domain.model.EstadoNodo;
import java.util.List;

/**
 * RF-CUR-06 — alcance MVP: el único tipo de regla soportado es umbral de XP mínimo.
 * Deliberadamente simple (una comparación) porque ese es el alcance real hoy; no se
 * disfraza de más complejo de lo que el requerimiento pide. Cuando en Fase 3 aparezcan
 * otros tipos de regla (insignia requerida, desafío específico, fecha), acá es donde
 * crece — probablemente a un {@link Specification} más, no a reescribir esto.
 */
public class MotorDesbloqueo {

    /** Desbloqueo ENTRE secciones: umbral de XP de la sección anterior (RF-CUR-06). */
    public boolean debeDesbloquear(int xpAcumuladoEnSeccion, int umbralXpDesbloqueo) {
        return xpAcumuladoEnSeccion >= umbralXpDesbloqueo;
    }

    /**
     * Desbloqueo DENTRO de una sección: un nodo con prerequisitos (conexiones entrantes)
     * se habilita cuando TODOS están completados — puede ser un nodo de fusión con más
     * de un prerequisito. Una lista vacía (nodo sin prerequisitos, ej. raíz de sección)
     * se considera trivialmente cumplida.
     */
    public boolean todosLosPrerequisitosCumplidos(List<EstadoNodo> estadosPrerequisitos) {
        return estadosPrerequisitos.stream().allMatch(estado -> estado == EstadoNodo.COMPLETADO);
    }
}
