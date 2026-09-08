# Deuda técnica — descubierta ejecutando `03-plan-de-implementacion.md`

## 🔴 1. `MsRoadmapApplicationIT` no está conectada a CI

**Qué falta:** bindear `maven-failsafe-plugin` a las fases `integration-test`/`verify`
para que el smoke test de arranque completo (necesita Postgres/Eureka reales) se corra
automáticamente en algún pipeline, en vez de solo a mano.

**Dónde vive:** `backend/ms-roadmap/src/test/.../MsRoadmapApplicationIT.java` — el
javadoc de la clase tiene el TODO explícito con el comando manual para correrla mientras
tanto.

**Por qué no bloquea la tarea actual:** la convención `*IT` hace que Surefire (fase
`test`) la excluya del build normal a propósito — `mvn test` y `mvn verify` dan verde
sin necesitar infraestructura, que era el objetivo de la Fase 0 ("cualquiera clona y
corre un comando"). Sin el binding, simplemente nadie la corre automáticamente todavía.

**Cómo se paga:** cuando el equipo defina dónde corre CI (GitHub Actions, etc.) — ahí se
agrega el plugin y se levanta la infra necesaria como parte del pipeline.

---

## 🔴 2. Stack completo sin verificar contra Docker real

**Qué falta:** correr `docker compose up --build` de punta a punta y confirmar que
`roadmap-service` se registra en Eureka, el Gateway lo rutea, y las migraciones de
Flyway corren limpias contra Postgres real.

**Dónde vive:** nota explícita en `path/06-contrato-api.md` §9.

**Por qué no bloquea la tarea actual:** cada pieza se verificó por separado y en verde:
`mvn compile`/`mvn test`/`mvn package` en los 3 módulos, y `docker compose config`
valida la sintaxis del compose sin necesitar el daemon corriendo. Lo que falta es la
integración real entre las piezas, no la corrección de cada una por separado.

**Cómo se paga:** la próxima vez que alguien del equipo tenga Docker Desktop levantado,
correr `docker compose up --build` y revisar los logs de cada servicio. Si algo falla,
es la primera vez que se sabría.
