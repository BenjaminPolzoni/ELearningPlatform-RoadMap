package ar.utn.frc.tup.roadmap.infrastructure.messaging.dto;

import java.util.UUID;

/**
 * ⚠️ CONTRATO ASUMIDO, no confirmado — mismo caso que
 * {@code DesafioCompletadoEventDto}: hipótesis de trabajo a validar con el Grupo 9 y con
 * el Tema 11 (dueño del contrato de eventos de la plataforma).
 */
public record RecuperacionCompletadaEventDto(
    UUID eventoId,
    UUID alumnoId,
    UUID cursoCohorteId,
    UUID recuperacionId,
    Resultado resultado
) {
    public enum Resultado { EXITO, FALLO }
}
