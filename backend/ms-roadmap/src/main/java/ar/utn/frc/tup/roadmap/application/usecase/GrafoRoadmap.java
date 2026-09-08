package ar.utn.frc.tup.roadmap.application.usecase;

import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapConexionEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapNodoEntity;
import ar.utn.frc.tup.roadmap.infrastructure.persistence.entity.RoadmapSeccionEntity;
import java.util.List;

/**
 * Proyección de lectura del grafo completo de un curso: lo que {@code GET /roadmaps/{cc}}
 * devuelve al editor. Es un holder de las 4 tablas del grafo ya cargadas — la capa REST
 * lo traduce a su DTO ({@code GrafoRoadmapResponse}), la de aplicación no conoce DTOs.
 */
public record GrafoRoadmap(
    RoadmapEntity roadmap,
    List<RoadmapSeccionEntity> seccionesOrdenadas,
    List<RoadmapNodoEntity> nodos,
    List<RoadmapConexionEntity> conexiones
) {}
