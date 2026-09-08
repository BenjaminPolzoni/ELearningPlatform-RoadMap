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
