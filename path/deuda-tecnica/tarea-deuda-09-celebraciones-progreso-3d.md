# Deuda de celebraciones de progreso 3D

## 🔴 1. Idempotencia del registro de progreso en el adapter mock

**Qué falta:** el adapter suma el XP recibido aunque el nodo ya esté completado.
Los consumidores evitan repeticiones, pero falta una defensa en el puerto ante
llamadas duplicadas desde otros consumidores o pestañas con estado desactualizado.

**Dónde vive:** `frontend/src/app/core/data/in-memory-roadmap.adapter.ts`,
`registrarProgreso`.

**Por qué no bloquea la tarea actual:** el flujo 3D bloquea envíos simultáneos y
no registra de nuevo desafíos completados; las celebraciones reflejan la respuesta
confirmada del mock. No se incorpora concurrencia entre pestañas en esta tarea.

**Cómo se paga:** al endurecer el mock compartido o conectar el adapter HTTP,
garantizar idempotencia por finalización y probar duplicados y pestañas concurrentes.
