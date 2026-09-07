package ar.utn.frc.tup.roadmap.application.usecase;

import ar.utn.frc.tup.roadmap.domain.model.Dificultad;
import java.util.UUID;

/**
 * Entrada del use case, desacoplada del formato de wire de Kafka a propósito — el
 * adapter ({@code infrastructure.messaging.DesafioCompletadoListener}) traduce el DTO del
 * tópico a esto. Si mañana cambia el JSON del evento, este record no se entera.
 *
 * <p>Alcance: solo nodos "normales" (DESAFIO_TEORICO/DESAFIO_PRACTICO/BOSS). Los nodos
 * RECUPERACION tienen reglas distintas (RF-REC-04: otorga vida en vez de XP, nunca resta
 * vida, reintentable sin límite) y van por un use case aparte — Camino 3, todavía no
 * implementado. {@code dificultad} solo aplica si {@code exito = true}.
 */
public record ProcesarDesafioCompletadoCommand(
    UUID origenEventoId,
    UUID alumnoId,
    UUID cursoCohorteId,
    UUID nodoId,
    boolean exito,
    Dificultad dificultad
) {
}
