package ar.utn.frc.tup.roadmap.infrastructure.messaging.dto;

import ar.utn.frc.tup.roadmap.domain.model.Dificultad;
import java.util.UUID;

/**
 * ⚠️ CONTRATO ASUMIDO, no confirmado — el Tema 11 (Social y Notificaciones) es quien
 * define el contrato de eventos real de toda la plataforma (propuesta de arquitectura,
 * "Define el contrato de eventos para toda la plataforma; su decisión condiciona a cinco
 * equipos"). Esta forma es una hipótesis de trabajo basada en lo que necesitamos nosotros
 * — hay que validarla con el Grupo 9 (Motor de Desafíos, quien lo publica) antes de
 * integrar de verdad. Es DTO puro de infraestructura: el dominio no lo conoce, ver
 * {@code ProcesarDesafioCompletadoCommand}.
 */
public record DesafioCompletadoEventDto(
    UUID eventoId,
    UUID alumnoId,
    UUID cursoCohorteId,
    UUID nodoId,
    Resultado resultado,
    Dificultad dificultad
) {
    public enum Resultado { EXITO, FALLO }
}
