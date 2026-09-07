# 01 · Arquitectura y stack

## 1. Versiones verificadas

Todo esto fue chequeado contra los registros oficiales, no es de memoria.

| Pieza | Versión | Cómo se verificó |
|---|---|---|
| **Angular** | `22.1.5` | `npm view @angular/core version` |
| **Spring Boot** | `4.1.1` | Spring Initializr `/metadata/client` |
| **Java** | `21` (LTS) | Boot 4 admite 17 / 21 / 25 / 26 |
| **daisyUI** | `5.7.28` | `npm view daisyui version` |
| **Tailwind CSS** | `4.3.3` | vía `@tailwindcss/postcss` |
| **three.js** | `0.185.1` | `npm view three version` |
| **PostgreSQL** | `17` | imagen `postgres:17-alpine` |
| **Docker** | `28.3.0` | instalado ✅ |
| **Node** | `24.14.1` | instalado ✅ |

### Nota sobre Java

El JDK local de la máquina era **1.8**, insuficiente para Boot 4. Se instala **Eclipse Temurin 21**
para el IDE, pero **el build de producción corre dentro de Docker** con `eclipse-temurin:21`,
así que la versión local no afecta al artefacto final ni al resto del equipo.

---

## 2. Decisiones de arquitectura

| Decisión | Elección | Por qué |
|---|---|---|
| Frontend | **Monolito modular** Angular 22, standalone components + lazy loading | La cátedra vetó micro-frontends. Cada squad es dueño de su carpeta de feature |
| Backend | **Microservicios** Spring Boot 4 | Regla de plataforma: cada servicio dueño exclusivo de su base |
| Entrada pública | **Nginx** (reverse proxy) | Sirve los estáticos de Angular y rutea el tráfico de toda la plataforma. TLS y punto de entrada único |
| Capa de front | **BFF personalizado** — ⚠️ **NO es nuestro** | Consolida datos de varios servicios *por experiencia de front*. Lo mantiene otro equipo; nosotros solo le exponemos endpoints limpios |
| Entrada a servicios | **API Gateway** — Spring Cloud Gateway (WebFlux) | Regla no negociable — ningún cliente accede a un microservicio por otro camino |
| Service discovery | **Netflix Eureka** | Cada micro se registra; el Gateway resuelve instancias sin direcciones fijas (deck Tema 01) |
| Base de datos | **PostgreSQL**, una por servicio | Nadie lee la tabla del vecino |
| Async | **Apache Kafka** (bus de eventos) | Coordinador de eventos asincrónicos. Lo asincrónico no pasa por el gateway |
| Empaquetado | **Docker Compose** | Un `docker compose up` levanta todo |
| Estilos | **Tailwind 4 + daisyUI 5** con tema arcade custom | Pedido del proyecto |
| 3D | **three.js**, cámara ortográfica + sprites | Ver `04-engine-2-5d.md` |

### El recorrido de una solicitud

```
Navegador
   │  (HTTPS)
   ▼
Nginx ──────────────►  estáticos de Angular (HTML/CSS/JS)
   │  /api/...
   ▼
BFF  (no es nuestro) ── consolida por pantalla: junta lo de Roadmap + monedas (Banco) + perfil (Identidad)
   │
   ▼
API Gateway ── valida JWT (firma/iss/aud/exp), limpia headers del cliente,       ┌──────────┐
   │           inyecta identidad verificada y rutea vía lb://  ◄───resuelve────►  │  Eureka  │
   │                                                                              │ (registro)│
   │   headers verificados: X-Principal-Type, X-User-Id, X-User-Roles,            └──────────┘
   │                        X-Request-Id, traceparent                                  ▲
   ▼                                                                          registro │ heartbeat
roadmap-service ──► PostgreSQL (nuestra base) ──────────────────────────────────────┘
   │  autoriza NEGOCIO: rol · pertenencia al curso · ownership del recurso (403 si no)
   ▼
Asíncrono (fuera de este camino):
   roadmap-service  ⇄  Kafka  ⇄  Motor de Desafíos, Cursos, Notificaciones, ...
```

> **Dos niveles de autorización (deck Tema 01):** el **Gateway** valida que el token sea auténtico
> (*quién sos* → 401 si no). **Nuestro servicio** decide *qué podés hacer* (rol, pertenencia,
> ownership → 403 si no). No revalidamos el JWT: confiamos en los headers `X-…` que el Gateway
> inyecta, confiables solo porque vienen de su red privada.
>
> **Qué nos toca y qué no:** somos dueños de **`roadmap-service`** y su base. **Nginx**, el **BFF**,
> el **API Gateway** y **Eureka** son piezas de plataforma de otros equipos. Nosotros exponemos
> endpoints limpios (para el BFF), nos registramos en Eureka y publicamos/consumimos bien los
> eventos de Kafka. La **agregación de datos ajenos** (monedas, perfil) la hace el **BFF** — nunca
> llamamos a Banco ni a Identidad para “rellenar” una respuesta. Detalle completo en
> `06-contrato-api.md` §0.

---

## 3. Estructura del repositorio

```
RepoDePruebas/
├─ docker-compose.yml            # levanta todo el stack
├─ path/                         # esta documentación
├─ Fotos_y_conceptos/            # referencias visuales
├─ Apuntes_e_info_tp/            # PRD, propuestas, material de cátedra
│
├─ frontend/                     # Angular 22 — monolito modular
│  ├─ .postcssrc.json
│  ├─ Dockerfile
│  └─ src/
│     ├─ styles.css              # @import tailwindcss + tema arcade
│     └─ app/
│        ├─ core/                # auth mock, rol, interceptors, DataAdapter
│        ├─ shared/ui/           # librería de componentes (co-owned con G2)
│        ├─ engine/              # three.js: escena, cámara, layout, sprites
│        ├─ features/
│        │  ├─ profesor/         # editor de curso, unidades y actividades
│        │  ├─ alumno/           # mapa de islas, mapa de unidad, HUD
│        │  └─ ranking/          # tabla, percentiles, cierre
│        └─ mocks/               # seed del curso de ejemplo
│
├─ backend/
│  ├─ gateway/                   # Spring Cloud Gateway — única puerta de entrada
│  └─ ms-roadmap/                # nuestro microservicio
│     └─ src/main/java/.../
│        ├─ domain/              # entidades y reglas (XP, vidas, ranking)
│        ├─ application/         # casos de uso
│        ├─ infrastructure/      # JPA, REST, consumidores de eventos
│        └─ config/
│
└─ docs/
   └─ openapi/ms-roadmap.yaml    # contrato — fuente de verdad del front
```

---

## 4. Contract-first: cómo trabajan front y back en paralelo

Este es el mecanismo que permite que los 4 squads avancen sin esperarse.

El front **nunca** llama a `HttpClient` directo desde un componente. Todo pasa por una
interfaz de dominio con dos implementaciones intercambiables:

```ts
// core/data/roadmap-data.port.ts
export abstract class RoadmapDataPort {
  abstract getRoadmap(cursoCohorteId: string): Observable<Roadmap>;
  abstract addUnidad(cursoCohorteId: string, dto: NuevaUnidad): Observable<Unidad>;
  abstract removeUnidad(cursoCohorteId: string, unidadId: string): Observable<void>;
  abstract getProgreso(alumnoId: string, cursoCohorteId: string): Observable<Progreso>;
  // ...
}
```

| Implementación | Cuándo se usa |
|---|---|
| `InMemoryRoadmapAdapter` | Fases 0-2. Lee el seed, muta en memoria, persiste en `localStorage`. **Simula lo que devolvería el BFF** |
| `HttpRoadmapAdapter` | Fase 3. Pega contra el **BFF** (que a su vez llama al gateway → `ms-roadmap`). Tipos generados desde el OpenAPI |

> Como el BFF **no es nuestro**, en el mock el `InMemoryRoadmapAdapter` cumple su rol: devuelve el
> JSON ya consolidado que el BFF entregaría (incluidos los campos que en producción vendrían de
> otros servicios, como monedas o perfil, marcados como stub). Así el front no depende de que el
> BFF exista para avanzar.

Cambiar de uno a otro es **una línea** en `app.config.ts`:

```ts
providers: [
  { provide: RoadmapDataPort, useClass: environment.useMock
      ? InMemoryRoadmapAdapter
      : HttpRoadmapAdapter },
]
```

> **Consecuencia práctica:** el squad de Engine y el de Editor pueden construir todo el mock
> sin que exista una sola línea de backend, y el día que el backend está listo no se toca
> ningún componente.

---

## 5. Instalación de Tailwind 4 + daisyUI 5 en Angular

Pasos exactos, tomados de la documentación oficial de daisyUI para Angular.

```bash
npm install -g @angular/cli@latest
ng new frontend --style css
cd frontend
npm install daisyui@latest tailwindcss@latest @tailwindcss/postcss@latest postcss@latest --force
npm pkg set browserslist="> 1%"
```

`frontend/.postcssrc.json`:

```json
{
  "plugins": {
    "@tailwindcss/postcss": {}
  }
}
```

`frontend/src/styles.css`:

```css
@import "tailwindcss";
@plugin "daisyui";
/* el tema arcade custom se define acá — ver 05-design-system.md */
```

---

## 6. Docker

### `docker-compose.yml` — servicios previstos

| Servicio | Imagen / build | Puerto | Notas |
|---|---|---|---|
| `frontend` | build local, multi-stage: Node build → `nginx:alpine` runtime | 80 | **Entrada pública.** Un solo contenedor: sirve los estáticos de Angular Y rutea `/api` (sin un segundo hop de Nginx separado — evita duplicar la capa) |
| `gateway` | build local (Boot 4, Spring Cloud Gateway) — stand-in local | 8080 | Única puerta a los microservicios. Ver nota abajo |
| `eureka` | build local (Boot 4, Netflix Eureka) — stand-in local | 8761 | Registro de servicios. `roadmap-service` se registra acá |
| `ms-roadmap` | build local (Boot 4) → `roadmap-service` | interno | **Nuestro.** No se expone al host; el Gateway lo alcanza por `lb://ROADMAP-SERVICE` |
| `postgres` | `postgres:17-alpine` | 5432 | Volumen persistente — base de `ms-roadmap` |
| `kafka` | `bitnami/kafka` (KRaft, sin Zookeeper) | 9092 | Bus de eventos asincrónicos |

> **El BFF no es nuestro** y no tiene contenedor en este compose: el `frontend` local apunta
> `/api/` directo al `gateway`, salteando la capa de consolidación que el BFF haría en
> integración real. Swap trivial cuando exista (cambiar el upstream en `frontend/nginx.conf`).
>
> **`gateway` y `eureka` son stand-ins de desarrollo local**, no la infraestructura real de
> la plataforma (esa la mantiene el Tema 01). Existen solo para que el equipo pueda levantar y
> probar el flujo completo en su propia máquina sin depender de que el Tema 01 tenga la suya
> corriendo. Se reemplazan en integración — ver `06-contrato-api.md` §0.

### Dockerfile del backend — multi-stage

Esto es lo que hace que **no importe la versión de Java local**:

```dockerfile
# --- build ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B clean package -DskipTests

# --- runtime ---
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Dockerfile del frontend — multi-stage

```dockerfile
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

---

## 7. Restricciones de plataforma que nos aplican

Estas vienen del documento de arquitectura de la cátedra y **no se renegocian por equipo**:

1. El API Gateway es la única puerta de entrada
2. No hay comunicación directa entre microservicios — toda llamada síncrona vuelve a pasar por el gateway
3. Cada servicio es dueño exclusivo de su base
4. Lo asincrónico viaja por el bus de eventos
5. Cada entidad tiene un dueño único
6. Toda entidad propia lleva `curso_cohorte_id`
7. Idempotencia al consumir eventos — deduplicar por `origen_evento_id`
8. Borrado lógico en todas las tablas, sin excepción

> Sobre el punto 2: *"consultar el estado archivado del curso"* debe implementarse como
> **suscripción a un evento** del bus (Cursos publica *"curso archivado"*, nosotros
> reaccionamos), **no** como consulta síncrona.
