/**
 * Puertos del dominio hacia afuera — deliberadamente VACÍO en Fase 0.
 *
 * <p>Para el CRUD simple del grafo (Roadmap/Sección/Nodo/Conexión), la capa
 * {@code application} usa directamente los repositorios de Spring Data
 * ({@code infrastructure.persistence.repository}) sin este nivel de indirección: no hay
 * regla de negocio que testear en aislamiento, es persistencia pura. Es una simplificación
 * deliberada para no sobre-diseñar donde todavía no hace falta.
 *
 * <p>Esta carpeta existe para cuando lleguen los MOTORES de la Fase 2 — MotorXp,
 * MotorVidas, MotorDesbloqueo, CalculadoraRanking (ver path/06-contrato-api.md §8) — que
 * SÍ tienen reglas de negocio no triviales y que el contrato exige "testeables sin
 * levantar Spring". Ahí un {@code port} desacopla esas reglas de JPA de verdad.
 */
package ar.utn.frc.tup.roadmap.domain.port;
