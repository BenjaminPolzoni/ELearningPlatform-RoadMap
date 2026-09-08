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

## Levantar la app

Hay tres formas, de menos a más. De la #2 en adelante hace falta **Docker Desktop corriendo**.

### 1. Solo tests del backend (no necesita Docker ni nada levantado)

```bash
cd backend/ms-roadmap
./mvnw -o clean test
```

Los unitarios corren sin Postgres, Kafka ni Eureka — es la verificación rápida antes de
cualquier commit (ver [`path/`](path/README.md) DoD §7).

### 2. Stack de backend completo (Postgres + Kafka + Eureka + Gateway + roadmap-service)

Es lo que funciona hoy end-to-end. El `frontend` todavía no tiene proyecto Angular
(solo `Dockerfile` + `nginx.conf`), así que se levanta todo **menos** ese servicio:

```bash
docker compose up --build postgres kafka eureka gateway ms-roadmap
```

| Servicio | URL / puerto | Para qué |
|---|---|---|
| Gateway | http://localhost:8080/api/roadmap/... | **la puerta de entrada** — todo pega acá |
| Eureka (debug) | http://localhost:8761 | ver que `roadmap-service` se registró |
| Postgres (debug) | `localhost:5432` · `roadmap` / `roadmap` / `roadmap` | inspeccionar tablas |
| Kafka (debug) | `localhost:9092` | publicar eventos a mano para probar los listeners |
| roadmap-service | interno (`expose: 8081`, sin puerto publicado) | nadie lo toca salteando el Gateway |

Probar que responde:

```bash
curl http://localhost:8080/api/roadmap/roadmaps/00000000-0000-0000-0000-000000000000
```

Bajar todo (y borrar la base):

```bash
docker compose down -v
```

### 3. Stack completo con frontend

`docker compose up --build` a secas levanta también el `frontend` en http://localhost,
pero **falla hasta que exista el scaffold de Angular**. Generarlo una vez (Fase 0, ver
[`path/01-arquitectura-y-stack.md`](path/01-arquitectura-y-stack.md)):

```bash
cd frontend && npx @angular/cli@22 new frontend --directory . --style css --routing
```

> `gateway` y `eureka` son **stand-ins de desarrollo local** — no la infraestructura real
> de la plataforma (esa la mantiene el Tema 01). Existen para poder probar el flujo
> completo sin depender de que otro equipo tenga la suya corriendo. Ver
> [`path/06-contrato-api.md`](path/06-contrato-api.md) §0.

## Desarrollo por módulo (sin Docker, contra infra suelta)

### Backend — `roadmap-service`

```bash
cd backend/ms-roadmap
docker compose up -d postgres kafka   # las únicas dependencias de arranque
./mvnw -o spring-boot:run             # queda en http://localhost:8081 (directo, sin Gateway)
./mvnw -o clean test                  # unitarios, no necesitan infra
```

Postgres es obligatorio (Flyway migra al arrancar y JPA valida el esquema). Sin Kafka
arranca igual, con reintentos de conexión en el log.

### Frontend — Angular 22 (una vez scaffoldeado)

```bash
cd frontend
npm install
npm start        # ng serve en http://localhost:4200
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
