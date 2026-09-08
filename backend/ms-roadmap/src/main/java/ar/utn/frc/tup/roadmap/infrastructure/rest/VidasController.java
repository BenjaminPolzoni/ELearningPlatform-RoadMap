package ar.utn.frc.tup.roadmap.infrastructure.rest;

import ar.utn.frc.tup.roadmap.application.usecase.IniciarRecuperacionUseCase;
import ar.utn.frc.tup.roadmap.infrastructure.rest.dto.RecuperacionAsignadaResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Ver path/06-contrato-api.md §2 "Vidas". */
@RestController
@RequiredArgsConstructor
@RequestMapping("${app.api.base-path:/api/roadmap}")
public class VidasController {

    private final IniciarRecuperacionUseCase iniciarRecuperacionUseCase;

    @PostMapping("/alumnos/{aid}/vidas/recuperacion")
    public ResponseEntity<RecuperacionAsignadaResponse> iniciarRecuperacion(
        @PathVariable("aid") UUID alumnoId,
        @RequestParam("curso_cohorte_id") UUID cursoCohorteId
    ) {
        UUID desafioId = iniciarRecuperacionUseCase.iniciar(alumnoId, cursoCohorteId);
        return ResponseEntity.ok(new RecuperacionAsignadaResponse(desafioId));
    }
}
