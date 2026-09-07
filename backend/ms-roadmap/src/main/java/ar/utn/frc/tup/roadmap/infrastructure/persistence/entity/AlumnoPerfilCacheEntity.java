package ar.utn.frc.tup.roadmap.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * ⚠️ REDUNDANTE, a confirmar con el equipo — ver path/06-contrato-api.md §6.2.
 *
 * <p>Se documentó originalmente para armar filas del ranking con nombre/avatar/legajo,
 * pero con el BFF (no nuestro) enriqueciendo la respuesta por pantalla, ese trabajo ya
 * no es nuestro. Se deja mapeada por si el equipo decide conservarla solo para el
 * anonimato de filas ajenas (RF-RNK-07) — no eliminar sin decisión de equipo.
 */
@Getter
@Setter
@Entity
@Table(name = "alumno_perfil_cache")
public class AlumnoPerfilCacheEntity extends EntidadBase {

    @Column(name = "alumno_id", nullable = false, unique = true)
    private UUID alumnoId;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(length = 150)
    private String nombre;

    @Column(length = 150)
    private String apellido;

    @Column(length = 50)
    private String legajo;

    @Column(name = "baja_logica", nullable = false)
    private boolean bajaLogica = false;
}
