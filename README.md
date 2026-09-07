# Roadmap y Progreso — Grupo 10

Mock de la plataforma de e-learning gamificada (TUP · UTN-FRC) — módulo Tema 10.

📖 **Toda la documentación funcional vive en [`path/`](path/README.md)**: requerimientos,
épicas, modelo de datos, arquitectura, engine 2.5D, design system y contrato de API.
Este README es solo el quickstart técnico.

## Prerrequisitos

| Herramienta | Versión | Notas |
|---|---|---|
| **Docker Desktop** | corriendo | El daemon, no solo el CLI — `docker compose up` lo necesita |
| **Node.js** | ≥ 24.15.0 | Requisito duro de Angular CLI 22 (falla con versiones menores) |
| **JDK** | 21 | Solo para el IDE — el build real corre en Docker con `eclipse-temurin:21` |

## Levantar todo el stack

```bash
docker compose up --build
```

| Servicio | URL |
|---|---|
| Frontend | http://localhost |
| Gateway (debug directo) | http://localhost:8080/api/roadmap/... |
| Eureka (debug directo) | http://localhost:8761 |

> `gateway` y `eureka` son **stand-ins de desarrollo local** — no la infraestructura real
> de la plataforma (esa la mantiene el Tema 01). Existen para poder probar el flujo
> completo sin depender de que otro equipo tenga la suya corriendo. Ver
> [`path/06-contrato-api.md`](path/06-contrato-api.md) §0.

## Desarrollo por módulo

### Backend — `roadmap-service`

```bash
cd backend/ms-roadmap
mvn spring-boot:run   # necesita Postgres accesible en localhost:5432 (o vía docker compose up postgres)
mvn test               # unitarios, sin necesitar infraestructura
```

### Frontend — Angular 22

```bash
cd frontend
npm install
ng serve
```

## Estructura

```
├─ path/           # documentación funcional — EMPEZAR ACÁ
├─ frontend/        # Angular 22 monolito modular
├─ backend/
│  ├─ ms-roadmap/   # NUESTRO microservicio — roadmap-service
│  ├─ gateway/      # stand-in local de Spring Cloud Gateway
│  └─ eureka-server/# stand-in local de Netflix Eureka
├─ docs/openapi/    # contrato — fuente de verdad del front
├─ docker-compose.yml
└─ Fotos_y_conceptos/, Apuntes_e_info_tp/   # material de referencia y de cátedra
```
