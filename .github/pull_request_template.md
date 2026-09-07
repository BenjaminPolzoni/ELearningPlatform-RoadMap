## Qué hace este PR

<!-- Una línea. Qué HU o épica cubre (ver path/README.md §4). -->

## RF trazado

<!-- Ej: RF-CUR-04. "Si no está trazado, no está hecho." -->

## Checklist de Definition of Done

- [ ] Compila: `ng build` OK / `mvn verify` OK
- [ ] Sin acceso directo a base ajena — todo por API Gateway (sync) o Kafka (async)
- [ ] Toda entidad propia con `curso_cohorte_id` y borrado lógico (RF-NFR-01)
- [ ] Tests unitarios sobre lo tocado
- [ ] Idempotencia al consumir eventos (dedupe por `origen_evento_id`)
- [ ] Cero parámetros hardcodeados — PAR-XX leídos en runtime
- [ ] Desktop-only: en móvil informa "requiere una computadora" (RF-NFR-05)
- [ ] Endpoint o evento actualizado en `docs/openapi/ms-roadmap.yaml`
- [ ] Aprobado por ≥ 1 revisor distinto del autor

## Notas / dudas abiertas que toca

<!-- Si este PR roza alguna duda de path/README.md §6, mencionarla acá. -->
