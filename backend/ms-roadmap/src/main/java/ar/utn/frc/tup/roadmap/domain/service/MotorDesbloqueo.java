package ar.utn.frc.tup.roadmap.domain.service;

/**
 * RF-CUR-06 — alcance MVP: el único tipo de regla soportado es umbral de XP mínimo.
 * Deliberadamente simple (una comparación) porque ese es el alcance real hoy; no se
 * disfraza de más complejo de lo que el requerimiento pide. Cuando en Fase 3 aparezcan
 * otros tipos de regla (insignia requerida, desafío específico, fecha), acá es donde
 * crece — probablemente a un {@link Specification} más, no a reescribir esto.
 */
public class MotorDesbloqueo {

    public boolean debeDesbloquear(int xpAcumuladoEnSeccion, int umbralXpDesbloqueo) {
        return xpAcumuladoEnSeccion >= umbralXpDesbloqueo;
    }
}
