# Deuda técnica — descubierta ejecutando `01-arquitectura-y-stack.md`

## 🔴 1. springdoc-openapi sin versión para Spring Boot 4

**Qué falta:** generar el OpenAPI en vivo (Swagger UI) desde las anotaciones del código
con `springdoc-openapi-starter-webmvc-ui`.

**Por qué no se hizo:** se verificó contra Maven Central que el techo publicado es
`2.8.6`, orientado a Spring Boot 3 / Spring Framework 6. Boot 4 (Spring Framework 7)
todavía no tiene una versión compatible publicada. Agregarlo a ciegas arriesgaba romper
el build por una dependencia transitiva incompatible.

**Dónde vive:** comentario explícito en `backend/ms-roadmap/pom.xml`, justo antes de
`</dependencies>`.

**Por qué no bloquea la tarea actual:** `docs/openapi/ms-roadmap.yaml`, escrito a mano,
ya cumple el rol de "fuente de verdad del contrato para el front" (el objetivo real de
tener un OpenAPI en esta fase). Lo que se pierde es la generación automática desde
código y la UI interactiva — cosas que ayudan pero no bloquean a nadie.

**Cómo se paga:** revisar de nuevo en Maven Central antes de escribir el CRUD completo
del grafo (Fase 1) o, a más tardar, antes del cierre del proyecto. Si para entonces sigue
sin existir versión compatible, evaluar `springdoc` en modo standalone contra el YAML
manual, o directamente mantener el YAML a mano como decisión permanente.

## 🔴 2. Three.js se descarga desde un CDN al abrir el mundo 3D

**Qué falta:** empaquetar Three.js y sus addons con los assets del frontend, en vez de
resolverlos desde `unpkg.com` cada vez que se abre el personalizador, la ciudad o el
preview del login.

**Dónde vive:** `frontend/public/mundo-3d/index.html` y
`frontend/public/mundo-3d/avatar-preview.html`, en sus respectivos `importmap`.

**Por qué no bloquea la tarea actual:** el flujo existente ya dependía del CDN y funciona
con conexión; el rediseño del avatar reutiliza exactamente esa infraestructura sin sumar
otra dependencia remota. Cambiar el pipeline de empaquetado no es necesario para validar
el nuevo modelo procedural.

**Cómo se paga:** al integrar definitivamente el mundo 3D al build de Angular, instalar
`three` como dependencia, servir los módulos compilados localmente y verificar que el
personalizador y la ciudad funcionan sin acceso a Internet.

## 🟢 3. ~~El frontend no excluye archivos innecesarios del contexto de Docker~~

**Qué faltaba:** crear `frontend/.dockerignore` para excluir al menos `node_modules/`,
`dist/`, cobertura y artefactos locales del contexto enviado al construir la imagen.

**Dónde vivía:** faltaba el archivo `frontend/.dockerignore`; el `Dockerfile` del
frontend copia el contexto mediante `COPY . .`.

**Por qué no bloquea la tarea actual:** la imagen se construye correctamente y las
capas de Docker siguen siendo válidas; el impacto actual es tiempo y transferencia de
archivos durante el build, no funcionamiento ni fidelidad del avatar.

**Cómo se paga:** agregar el `.dockerignore` al optimizar el pipeline de desarrollo y
comparar el tamaño del contexto antes y después con `docker compose build frontend`.

**Pagada:** se agregó `frontend/.dockerignore` durante la integración del avatar GLB,
excluyendo dependencias, build, cobertura, caché de Angular y logs.
