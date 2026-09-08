package ar.utn.frc.tup.roadmap.application.usecase;

import ar.utn.frc.tup.roadmap.domain.exception.RoadmapNoEncontradoException;
import ar.utn.frc.tup.roadmap.domain.exception.SeccionNoEncontradaException;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapConexionEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapNodoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapSeccionEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapConexionRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapNodoRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapRepository;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.repository.RoadmapSeccionRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * CRUD de la "unidad" / isla (RF-CUR-06, contrato §1). Calca el patrón de
 * {@link RoadmapService}: habla directo con los repositorios de Spring Data — no hay
 * regla de negocio que aislar en un motor de dominio, es persistencia con validación
 * de pertenencia (ver domain.port.package-info).
 */
@Service
@RequiredArgsConstructor
public class SeccionService {

    private final RoadmapRepository roadmapRepository;
    private final RoadmapSeccionRepository seccionRepository;
    private final RoadmapNodoRepository nodoRepository;
    private final RoadmapConexionRepository conexionRepository;

    @Transactional
    public RoadmapSeccionEntity crear(UUID cursoCohorteId, String nombre, int umbralXpDesbloqueo, int orden) {
        RoadmapEntity roadmap = requerirRoadmap(cursoCohorteId);

        RoadmapSeccionEntity seccion = new RoadmapSeccionEntity();
        seccion.setRoadmapId(roadmap.getId());
        seccion.setNombre(nombre);
        seccion.setUmbralXpDesbloqueo(umbralXpDesbloqueo);
        seccion.setOrden(orden);
        return seccionRepository.save(seccion);
    }

    @Transactional
    public RoadmapSeccionEntity actualizar(
        UUID cursoCohorteId, UUID seccionId, String nombre, int umbralXpDesbloqueo, int orden
    ) {
        RoadmapSeccionEntity seccion = requerirSeccionDe(cursoCohorteId, seccionId);
        seccion.setNombre(nombre);
        seccion.setUmbralXpDesbloqueo(umbralXpDesbloqueo);
        seccion.setOrden(orden);
        return seccionRepository.save(seccion);
    }

    /**
     * Baja lógica de la sección y, en cascada, de sus nodos activos y de toda conexión
     * que toque esos nodos (RF-NFR-01: nada se borra físico; RF-CUR-09 conserva el
     * histórico). Sin la cascada quedarían nodos "vivos" colgando de una isla que ya no
     * se dibuja.
     */
    @Transactional
    public void eliminar(UUID cursoCohorteId, UUID seccionId) {
        RoadmapSeccionEntity seccion = requerirSeccionDe(cursoCohorteId, seccionId);

        List<RoadmapNodoEntity> nodos = nodoRepository.findBySeccionIdAndActivoTrue(seccionId);
        List<UUID> nodoIds = nodos.stream().map(RoadmapNodoEntity::getId).toList();

        if (!nodoIds.isEmpty()) {
            List<RoadmapConexionEntity> conexiones = conexionRepository.findActivasQueTocan(nodoIds);
            conexiones.forEach(RoadmapConexionEntity::darDeBaja);
            conexionRepository.saveAll(conexiones);

            nodos.forEach(RoadmapNodoEntity::darDeBaja);
            nodoRepository.saveAll(nodos);
        }

        seccion.darDeBaja();
        seccionRepository.save(seccion);
    }

    @Transactional(readOnly = true)
    public List<RoadmapSeccionEntity> listar(UUID cursoCohorteId) {
        RoadmapEntity roadmap = requerirRoadmap(cursoCohorteId);
        return seccionRepository.findByRoadmapIdAndActivoTrueOrderByOrdenAsc(roadmap.getId());
    }

    private RoadmapEntity requerirRoadmap(UUID cursoCohorteId) {
        return roadmapRepository.findByCursoCohorteIdAndActivoTrue(cursoCohorteId)
            .orElseThrow(() -> new RoadmapNoEncontradoException(cursoCohorteId));
    }

    private RoadmapSeccionEntity requerirSeccionDe(UUID cursoCohorteId, UUID seccionId) {
        RoadmapEntity roadmap = requerirRoadmap(cursoCohorteId);
        RoadmapSeccionEntity seccion = seccionRepository.findByIdAndActivoTrue(seccionId)
            .orElseThrow(() -> new SeccionNoEncontradaException(seccionId));
        if (!seccion.getRoadmapId().equals(roadmap.getId())) {
            // La sección existe pero es de otro curso — 404, no se filtra su existencia.
            throw new SeccionNoEncontradaException(seccionId);
        }
        return seccion;
    }
}
