package ar.utn.frc.tup.roadmap.domain.model;

/**
 * Rótulo cosmético del HUD, derivado del XP total del alumno contra la curva del curso
 * (RF-NIV-05: no hay techo ni reseteo de XP por nivel — el ranking siempre ordena por XP
 * real). Nunca se persiste como estado del alumno; se calcula on-read con
 * {@link ar.utn.frc.tup.roadmap.domain.service.CurvaNiveles#nivelPara(int)}.
 */
public record Nivel(String nombre, int umbralXp, int orden) {}
