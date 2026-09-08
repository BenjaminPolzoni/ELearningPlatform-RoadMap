# Deuda técnica — descubierta ejecutando `02-modelo-de-datos.md`

## 🔴 1. `CalculadoraXpOtorgadoDesafio` solo aplica PAR-01, faltan PAR-04 y PAR-05

**Qué falta:** el monto de XP de un desafío completado con éxito debería sumar, además
del XP base por dificultad (PAR-01), el ajuste por calidad y tiempo de solución (PAR-04)
y el ajuste por score de uso de IA (PAR-05).

**Dónde vive:** `backend/ms-roadmap/.../domain/service/CalculadoraXpOtorgadoDesafio.java`
— tiene un `TODO Fase 2` explícito en el método `calcular`.

**Por qué no bloquea la tarea actual:** el flujo de punta a punta (Camino 1 del BPMN)
ya funciona con el cálculo base — un alumno completa un nodo, recibe XP, el nodo pasa a
completado. El ajuste es un refinamiento **aditivo** al monto, no un cambio de forma: se
agrega sumando términos a lo que ya existe, no reescribiendo la Strategy.

**Cómo se paga:** cuando se resuelva de dónde sale el "factor de calidad/tiempo" (PAR-04
no tiene fórmula documentada todavía, ver `path/README.md` §6) y cuando el evento de
Evaluación LLM (RF-IA) exponga el score de uso de IA que alimenta PAR-05.

---

## 🔴 2. `LectorParametrosStubAdapter` con valores hardcodeados

**Qué falta:** un adapter real del puerto `LectorParametrosPort` que llame a Backoffice
(Tema 12) vía Gateway con token técnico, en vez de devolver constantes.

**Dónde vive:** `backend/ms-roadmap/.../infrastructure/client/LectorParametrosStubAdapter.java`
— tiene un `TODO Fase 3` explícito con el `aud`/`scope` que va a necesitar.

**Por qué no bloquea la tarea actual:** Backoffice todavía no existe como servicio en
ningún ambiente — no hay nada real contra qué integrar todavía. El stub devuelve
exactamente los valores de referencia documentados en `path/README.md` §3.6, no números
inventados, así que el comportamiento del sistema hoy es fiel al MVP documentado.

**Cómo se paga:** cuando el Grupo 6 (Backoffice) publique su servicio y su contrato de
lectura de parámetros — reemplazar la clase entera, la interfaz del puerto no cambia
(ese es justamente el punto de tener el puerto).
