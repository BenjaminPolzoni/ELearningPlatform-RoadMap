# Deuda técnica — descubierta ejecutando `04-engine-2-5d.md`

## 🔴 1. El mapa 2.5D es SVG proyectado a mano, no el engine three.js del plan

**Qué falta:** el engine que describe 04 §2-§6 — cámara ortográfica isométrica de three.js,
islas como quads texturizados con un atlas de sprites pixel-art, caminos con
`CatmullRomCurve3` + `TubeGeometry`, y `UnrealBloomPass` para el glow.

**Qué se hizo en su lugar:** la misma escena resuelta con matemática 2D y SVG —
`core/iso/iso.ts` proyecta el layout a pantalla, las islas se arman con polígonos (tapa +
dos caras + base rocosa) y el neón sale de `feGaussianBlur`. Se respetan las dos reglas
duras del plan: la **posición siempre se calcula** (`layoutIslas()` es determinista y
reflowea al agregar/quitar unidades) y el arte es intercambiable sin tocar el layout.

**Dónde vive:** `frontend/src/app/core/iso/iso.ts` (proyección y layout) y
`frontend/src/app/features/alumno/mapa.ts` (escena). Ambos con el porqué en el JSDoc de
cabecera.

**Por qué no bloquea la tarea actual:** el objetivo del rediseño era visual y funcional —
recorrer nodos según XP con un avatar propio — y eso está entero y verificado en el
navegador. Además el camino SVG **gana** en dos requisitos del propio design system: cada
isla es un nodo del DOM con `tabindex`, `role` y `aria-label` (05 §7, imposible sobre un
canvas sin duplicar el árbol), y no mete three.js (~600 kB) en un front que hoy pesa
120 kB iniciales.

**Cómo se paga:** cuando exista el atlas de sprites y el squad Engine arranque (04 §8,
"estrategia en dos tiempos"). `layoutIslas()` devuelve coordenadas de **mundo**, no
píxeles, así que se reutiliza tal cual: lo que se reescribe es solo la capa de render.
Antes de encararlo hay que medir si el bloom real aporta sobre el `feGaussianBlur` actual
— si no aporta, la deuda se cierra como "no se paga" y esta pasa a ser la implementación
definitiva.

---

## 🔴 2. Sin tests unitarios de `layoutIslas()`

**Qué falta:** los tests que pide el checklist de 04 §10 — determinismo (mismo `n`, mismo
resultado) y no-solapamiento (la distancia proyectada entre islas consecutivas supera el
ancho de la tapa).

**Dónde vive:** `frontend/src/app/core/iso/iso.ts`. El proyecto ya tiene vitest configurado
(`frontend/package.json`), así que el archivo iría en `iso.spec.ts`.

**Por qué no bloquea la tarea actual:** el no-solapamiento se verificó a ojo en el
navegador con el seed de 4 unidades, y el determinismo es evidente por construcción (no
hay `Math.random()`: el ruido sale de `Math.sin(i)`). Pero es exactamente el tipo de
función que se rompe en silencio al tocar una constante.

**Cómo se paga:** al agregar la primera suite de tests del front. Es barato — la función
es pura y no necesita TestBed.
