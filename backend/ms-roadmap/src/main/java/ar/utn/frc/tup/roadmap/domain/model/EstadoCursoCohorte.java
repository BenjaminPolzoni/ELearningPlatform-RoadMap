package ar.utn.frc.tup.roadmap.domain.model;

/**
 * NO es nuestro — lo dueño Cursos (Tema 02). Vive acá solo como tipo del cache externo
 * {@link ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.CursoCohorteContextoEntity},
 * alimentado por evento. Ver path/02-modelo-de-datos.md §3 "Caches externos".
 */
public enum EstadoCursoCohorte {
    DRAFT,
    ACTIVO,
    ARCHIVADO
}
