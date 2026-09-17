# Registro de contribuciones

Este archivo define la documentación mínima que debe dejar **cada contribuyente del
repositorio** por cada commit o sesión de trabajo relevante. El objetivo es que otra
persona pueda entender qué se hizo, por qué se hizo y cómo verificarlo sin reconstruir
la historia desde cero.

La explicación debe acompañar al commit, al Pull Request o a la sesión de trabajo.
Cuando una sesión produce varios commits relacionados, puede dejar una única entrada
que liste todos los hashes involucrados.

## Qué debe explicar cada contribuyente

1. **Identificación**
   - Nombre o identificador del contribuyente.
   - Fecha de la sesión.
   - Hash del commit o commits relacionados.
   - Rama y Pull Request, si corresponde.

2. **Objetivo**
   - Qué requerimiento, historia de usuario, bug o tarea se resolvió.
   - Referencias de trazabilidad: RF, HU, CA, BDD o sección de `path/`.

3. **Cambios realizados**
   - Qué comportamiento se agregó, modificó o corrigió.
   - Archivos, módulos o endpoints principales afectados.
   - Cambios de base de datos, contrato OpenAPI, eventos o UI, cuando aplique.

4. **Decisiones y reglas respetadas**
   - Decisiones de diseño relevantes y su motivo.
   - Reglas de negocio implementadas.
   - Consideraciones de seguridad, permisos, idempotencia, append-only,
     borrado lógico, accesibilidad o performance que correspondan.

5. **Validación**
   - Comandos ejecutados.
   - Tests, build, lint o validaciones manuales realizadas.
   - Resultado concreto de cada validación.
   - Bloqueos del entorno o validaciones pendientes, explicados sin ocultarlos.

6. **Pendientes**
   - Deuda técnica registrada en `path/deuda-tecnica/`, si corresponde.
   - Dudas abiertas que requieran decisión del equipo o de la cátedra.
   - Riesgos o incompatibilidades que el siguiente contribuyente deba conocer.

## Plantilla de entrada

Copiar esta plantilla para documentar una contribución:

```markdown
## [AAAA-MM-DD] — [título breve]

**Contribuyente:** [nombre o identificador]
**Sesión/commit:** [`<hash>`](../commit/<hash>)  
**Rama:** `<rama>`
**Pull Request:** [#<número>](<URL>) <!-- opcional -->

### Objetivo

[Qué se resolvió y qué requerimiento/HU/RF/CA/BDD lo justifica.]

### Cambios realizados

- [Cambio funcional principal.]
- [Archivos, módulos, endpoints, eventos o pantallas involucradas.]
- [Migraciones, contratos o mocks actualizados, si aplica.]

### Decisiones y reglas

- [Decisión relevante y motivo.]
- [Regla de negocio, seguridad, idempotencia, append-only, accesibilidad o
  performance aplicada.]

### Validación

| Comando o verificación | Resultado |
|---|---|
| `<comando>` | [✅ En verde / ❌ Falló / ⚠️ Bloqueado] |
| `<verificación manual>` | [resultado] |

### Pendientes y riesgos

- [Deuda técnica registrada, duda abierta o riesgo.]
- [Escribir “Ninguno” si no hay pendientes.]
```

## Criterio de completitud

Una contribución no se considera documentada si solo dice “se hicieron cambios” o
enumera archivos sin explicar el comportamiento y la validación. La entrada debe ser
lo bastante precisa para que un revisor pueda:

- relacionarla con un requerimiento;
- identificar el efecto observable del cambio;
- reproducir o revisar la validación;
- saber qué quedó fuera de alcance.

La documentación no reemplaza los mensajes **Conventional Commits**, el Pull Request,
los tests ni el registro de deuda técnica. Los complementa y deja una explicación
humana del trabajo realizado.

## Registro de esta sesión

## 2026-09-16 — Marcado de lectura de contenido teórico y guía de contribuciones

**Contribuyente:** usuario de la sesión / Copilot CLI  
**Sesión/commit:** sesión actual; **sin commit todavía**  
**Rama:** `feature/espacio-vehiculos-estructuras`  
**Pull Request:** no creado

### Objetivo

Implementar la historia de usuario de alumno que marca como leído un nodo de contenido
teórico de una unidad desbloqueada, para que el avance de lectura pueda habilitar los
desafíos de la unidad. También se agregó esta guía para que todos los contribuyentes
documenten sus commits o sesiones.

Trazabilidad principal:

- RF-NFR-01: el marcado se registra como movimiento histórico append-only.
- HU de marcado de lectura de contenido.
- CA1–CA4 y escenarios BDD de marcado válido, repetido, unidad bloqueada y baja lógica.
- `path/02-modelo-de-datos.md` y `path/06-contrato-api.md`.

### Cambios realizados

- Se agregó el ledger `lectura_contenido` con timestamp y unicidad por
  alumno/curso-cohorte/nodo.
- Se implementó el endpoint:
  `POST /api/roadmap/roadmaps/{cc}/nodos/{nodoId}/lectura`.
- El alumno se obtiene exclusivamente de `X-User-Id`; no puede enviarse otro alumno en
  el body.
- Se implementó la proyección:
  `GET /api/roadmap/roadmaps/{cc}/unidades/{unidadId}/avance-lectura`, con alias para
  `/secciones/{seccionId}/avance-lectura`.
- La proyección cuenta únicamente contenido obligatorio activo y conserva lecturas de
  nodos dados de baja.
- Se agregaron migración Flyway, entidad, repositorio, servicio, controlador, DTOs,
  excepciones, manejo de Problem Details y tests unitarios.
- Se actualizó `TipoNodo` para soportar `CONTENIDO`.
- En el mock Angular se agregó el botón accesible **“MARCAR COMO LEÍDO Y CONTINUAR”**,
  persistencia en `localStorage`, idempotencia y rechazo de nodos bloqueados.
- Se actualizaron el contrato OpenAPI y la documentación funcional.
- Se creó esta guía en `docs/REGISTRO-DE-CONTRIBUCIONES.md` y se enlazó desde
  `README.md`.

### Decisiones y reglas

- El marcado no es un booleano editable ni otorga XP: es un hecho histórico append-only.
- La unicidad de base de datos y la consulta previa hacen idempotente el marcado repetido.
- El estado del alumno no se toma de la URL ni del body.
- El contenido dado de baja deja de contar para la obligatoriedad, pero no elimina
  movimientos históricos.
- El botón de lectura comunica su estado con texto, además del estilo visual.

### Validación

| Comando o verificación | Resultado |
|---|---|
| `git diff --check` | ✅ Correcto |
| Parseo del YAML OpenAPI | ✅ Correcto |
| `mvn clean test` | ⚠️ Bloqueado: Java/Maven no están disponibles y el wrapper no pudo descargar Maven por permisos del entorno |
| `npm run build -- --configuration production` | ⚠️ Bloqueado: `npm` no está disponible |
| Revisión de endpoints, migración y tests agregados | ✅ Realizada |

### Pendientes y riesgos

- Los cambios permanecen sin commit y deben ser revisados antes de integrar.
- Debe ejecutarse `mvn clean test` y `mvn clean package` en un entorno con Java/Maven.
- Debe ejecutarse el build/test de Angular en un entorno con Node/npm.
- No se creó una deuda técnica nueva en esta sesión: el material teórico continúa siendo
  mock, conforme al alcance solicitado.
