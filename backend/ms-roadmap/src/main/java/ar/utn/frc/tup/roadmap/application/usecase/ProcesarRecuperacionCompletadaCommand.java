package ar.utn.frc.tup.roadmap.application.usecase;

import java.util.UUID;

/**
 * Entrada de la segunda mitad del Camino 3 — desacoplada del transporte, igual que
 * {@link ProcesarDesafioCompletadoCommand}. {@code recuperacionId} es el id de
 * {@code DesafioRecuperacionEntity} (nuestro), no el {@code desafioId} externo que
 * {@link IniciarRecuperacionUseCase} le entregó al alumno — quien nos avisa el resultado
 * necesita decirnos CUÁL de nuestras filas del pool fue.
 */
public record ProcesarRecuperacionCompletadaCommand(
    UUID origenEventoId,
    UUID alumnoId,
    UUID cursoCohorteId,
    UUID recuperacionId,
    boolean exito
) {
}
