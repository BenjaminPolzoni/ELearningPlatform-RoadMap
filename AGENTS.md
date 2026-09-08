# AGENTS.md

> Formato [AGENTS.md](https://agents.md) — instrucciones para agentes de código
> (Claude Code, Cursor, Aider, Copilot, o cualquier otro) que trabajen en este repositorio.
> Reconocido junto con archivos `AGENTS.md` anidados en subcarpetas, que agregan detalle
> específico de esa carpeta sin reemplazar esto.

## Qué es este repo

Módulo **"Roadmap y Progreso"** (Tema 10, Grupo 10) de una plataforma de e-learning
gamificada — proyecto universitario con 12 grupos trabajando en paralelo sobre
microservicios independientes.

| Carpeta | Qué es |
|---|---|
| `path/` | Documentación funcional: requerimientos, modelo de datos, arquitectura, contrato de API. **Leer antes de escribir código.** |
| `path/deuda-tecnica/` | Ver [`path/deuda-tecnica/AGENTS.md`](path/deuda-tecnica/AGENTS.md) — regla obligatoria, no opcional |
| `backend/ms-roadmap/` | El microservicio propio (`roadmap-service`), Spring Boot 4.1.1 + Java 21 |
| `backend/gateway/`, `backend/eureka-server/` | Stand-ins locales de infraestructura — no son la infraestructura real de la plataforma |
| `frontend/` | Angular 22 (pendiente de arrancar) |
| `docs/openapi/` | Contrato de API — fuente de verdad para el frontend |

Empezar siempre por [`path/README.md`](path/README.md).

## Regla obligatoria: deuda técnica

Mientras ejecutás **cualquier tarea** de este repo (backend, frontend, docs — no importa
en qué carpeta estés parado) y descubrís algo que falta pero **no es crítico para cerrar
la tarea actual** — algo corregible más adelante sin comprometer el sistema —
**registralo en `path/deuda-tecnica/`**, no solo en un comentario de código.

La convención completa (cuándo aplica vs. cuándo es un bug o una duda, nombrado de
archivos, template exacto de cada ítem, workflow paso a paso) está en
[`path/deuda-tecnica/AGENTS.md`](path/deuda-tecnica/AGENTS.md). Leerlo **antes** de la
primera vez que registres algo ahí.

## Estrategia de ramas (Git Branching Model)

Protege el código de producción y aísla los entornos de prueba. Es estricta, no una
sugerencia.

| Rama | Rol | Reglas |
|---|---|---|
| `main` | **Producción.** Siempre estable, siempre desplegable | NUNCA se programa ni se commitea acá directo |
| `pruebas` (staging) | Corre en paralelo a producción. Donde devs y testers validan | NO se programa acá directo — solo recibe merges |
| `feature/*`, `fix/*` | Donde efectivamente se programa | Se derivan **siempre de `pruebas`**, nunca de `main` |

> ⚠️ **Estado real de este repo:** hoy solo existe `main` (con el commit de Fase 0). La
> rama `pruebas` **todavía no fue creada** — hay que crearla desde `main` antes de abrir
> la primera `feature/*` bajo esta regla.

**Nomenclatura de sub-ramas:** el nombre coincide con el plan de implementación que
resuelve — `feature/camino-3-recuperacion-vida`, `fix/estado-nodo-fallado`, no
`feature/cambios` ni nada genérico. Si un squad necesita sub-dividir su feature, las
ramas hijas nacen de esa sub-rama, pero la raíz de todas sigue siendo `pruebas`.

**Flujo de integración:**

1. Programar en la sub-rama de implementación.
2. Validación local: compila y los tests pasan (`mvn clean test` / `mvn clean package`
   en verde, ver checklist de abajo).
3. PR/merge de la sub-rama → `pruebas`. Nunca directo a `main`.
4. `pruebas` → `main` **solo** con aprobación explícita del desarrollador principal, y
   solo después de validar en el entorno de pruebas.

## Commits y prácticas de código

- **Atómicos, por fase lógica.** Terminaste la UI: commit. Terminaste la lógica de base
  de datos: otro commit. No acumules cientos de cambios sin relación en uno solo.
- **Conventional Commits** en el título — `feat: agrega motor de desbloqueo en cascada`,
  `fix: corrige transición FALLADO→HABILITADO inexistente`. El cuerpo explica el **por
  qué**, no solo el qué (el diff ya dice el qué).
- Todo commit de un agente de IA cierra con la línea de atribución vigente en la sesión
  (`Co-Authored-By: ...`) — ver las instrucciones de atribución del sistema, no la
  hardcodees en este archivo porque cambia de sesión a sesión.
- **Comentarios donde la lógica de negocio o la decisión de diseño no es obvia a simple
  vista** — no comentar lo evidente. Ver `EstadoNodo.java` o `MotorVidas.java` como
  ejemplo del nivel esperado: el comentario explica el *por qué* de la regla (con su RF),
  no repite lo que la firma del método ya dice.
- **Purgar código muerto** — funciones, variables e imports sin uso no se dejan "por las
  dudas".
- **Seguridad primero:** nunca loguear ni exponer `.env` o secretos. Validar rol/permiso
  (`X-User-Roles`, ver `RoadmapController.exigirRolProfesor`) en todo endpoint sensible
  antes de ejecutar la lógica de negocio.

## Otras reglas de trabajo de este repo

- **No inventes decisiones de arquitectura o de negocio no confirmadas** sin marcarlas
  explícitamente como tales (⚠️ en el código y en el `path/` correspondiente). Ver
  ejemplos reales: `LectorParametrosStubAdapter`, `DesafioRecuperacionEntity`.
- **Corregí las inconsistencias que encuentres en el momento**, no las dejes pasar — y
  documentá la corrección explícitamente (ver la nota de corrección en
  `backend/ms-roadmap/.../domain/model/EstadoNodo.java` como ejemplo del nivel de
  explicitud esperado).
- El dominio (`domain/*` en `ms-roadmap`) no importa Spring ni JPA — se testea con JUnit
  puro, sin `@SpringBootTest`. Si una clase de dominio necesita un framework para
  testearse, probablemente esté en la carpeta equivocada.
- Antes de dar una tarea de backend por terminada: `mvn clean test` y `mvn clean package`
  en verde. Actualizar el checklist de `path/06-contrato-api.md` §9.
