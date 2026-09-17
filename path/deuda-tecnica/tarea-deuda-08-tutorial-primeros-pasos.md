# Deuda técnica — Tutorial de primeros pasos

## 🔴 1. Preferencia del tutorial por identidad real

**Qué falta:** recordar avance/omisión por alumno cuando exista identidad real,
incluyendo uso desde distintos navegadores. Hoy es por navegador y versión.

**Dónde vive:** `frontend/src/app/features/alumno/tutorial/tutorial-state.ts`,
clave `roadmap.primeros-pasos.v1`.

**Por qué no bloquea la tarea actual:** el login es un selector de roles mock y
la versión por navegador fue aprobada en el plan; el tutorial funciona completo.

**Cómo se paga:** al integrar Identidad, definir la persistencia de preferencias
con su contrato y migrar la preferencia local sin transferirla a otros alumnos.

## 🔴 2. Cámara inicial demasiado cerca del puesto de mercado

**Qué falta:** evitar que el techo y cartel del mercado tapen al personaje al
entrar a la ciudad. Reproducido en Chrome 1280×720 en un contexto limpio.

**Dónde vive:** `frontend/public/mundo-3d/index.html`, `switchMode('city')`,
posición de aparición junto a Shop y offset de cámara.

**Por qué no bloquea la tarea actual:** caminar despeja la vista y el tutorial
permanece legible y operable. Es un problema visual previo del encuadre, no del
marcador; cambiar la cámara excede la guía y afecta toda la exploración.

**Cómo se paga:** en la próxima revisión de cámara/spawn, verificar un punto de
entrada despejado en 1280×720 y 1920×1080 con todas las cantidades de unidades.
