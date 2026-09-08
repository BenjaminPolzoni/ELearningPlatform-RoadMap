package ar.utn.frc.tup.roadmap.infrastructure.rest.dto;

import java.util.UUID;

/** Respuesta de POST /alumnos/{aid}/vidas/recuperacion — RF-REC-04. */
public record RecuperacionAsignadaResponse(UUID desafioId) {
}
