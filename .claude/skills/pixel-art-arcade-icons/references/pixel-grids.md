# Grillas de píxeles ya diseñadas

Todas viven también en `scripts/pixel_svg.py` (variable `GRIDS`), en formato
Python listo para importar. Este archivo es la versión legible para
consultar rápido sin abrir el script.

Técnica: cada ícono es una grilla de enteros (9x9 salvo aclaración). `0` es
transparente; el resto de los números mapean a un color mediante un
diccionario `colors`. Cada celda se dibuja como un `<rect>` — no es una
imagen rasterizada, es SVG vectorial real, editable en Figma o en código.

## Vidas y racha

| Ícono | Estado | Notas |
|---|---|---|
| `heart_full` | ✅ listo | Vida vigente |
| `heart_empty` | ✅ listo | Vida perdida — misma forma que `heart_full`, paleta apagada |
| `heart_halo` | ✅ listo | Insignia "Sin heridas" — mismo dibujo, contorno dorado en vez de negro |
| `fire_racha` | ✅ listo | Racha activa (7x9, no 9x9) |

**Importante:** vidas solo tiene 2 estados (llena/vacía). No hay "medio
corazón" como estado de datos — si hace falta una transición visual al
perder una vida, es una animación entre los dos estados existentes, no un
tercer estado nuevo que modelar.

## Catálogo de insignias — 13 transversales + 2 por nodo

Transversales (criterio evaluable con datos propios del módulo, sin
depender de otro servicio):

| Ícono | Insignia | Estado |
|---|---|---|
| `badge_seccion_perfecta` | Sección perfecta | ✅ listo |
| `badge_a_la_primera` | A la primera | ✅ listo |
| `badge_segunda_oportunidad` | Segunda oportunidad | ⚠️ rehacer — parece cruz, no flecha |
| `badge_hito_xp_bronce/plata/oro` | Hito de XP (3 tiers) | ✅ listo — misma forma, cambia el color por tier |
| `badge_subiste_de_nivel` | Subiste de nivel | ⚠️ rehacer — parece gorrito, no rango |
| `badge_zona_elite` | Zona de élite (P90) | ✅ listo |
| `badge_primeros_pasos` | Primeros pasos | ✅ listo |
| `badge_explorador` | Explorador | ⚠️ rehacer — parece carita, no brújula |
| `badge_maraton` | Maratón | ⚠️ rehacer — parece poción, no cronómetro |
| `badge_pionero` | Pionero | ✅ listo |

Por nodo (las asigna el profesor al armar un nodo puntual en el editor):

| Ícono | Insignia | Estado |
|---|---|---|
| `badge_boss` | Boss / hito especial | ✅ listo |
| `badge_evento` | Insignia de evento | ✅ listo |

Insignias con dependencia de otro equipo, anotadas pero **no implementadas
todavía** (no tienen ícono, no armar uno hasta que se confirme la
integración):

- "Sin pistas de IA" — depende del score de uso de IA (Evaluación LLM).
- "Código impecable" — depende de una evaluación de calidad de código
  (Desafíos Prácticos).

## Íconos genéricos del selector del CRUD

Estos son para que el profesor arme insignias **nuevas** sin pisar el
significado de las 15 de arriba. Librería separada a propósito — no
reutilizar los íconos del catálogo acá.

| Ícono | Estado |
|---|---|
| `generic_star` | ⚠️ rehacer |
| `generic_gem` | ✅ listo |
| `generic_sword` | ⚠️ rehacer — muy fina |
| `generic_book` | ✅ listo |
| `generic_lightning` | ✅ listo |
| `generic_medal` | ⚠️ rehacer — cinta ilegible |
| `generic_key` | ⚠️ rehacer — muy fina |
| `generic_potion` | ✅ listo |

## Sobre los íconos marcados "rehacer"

Todos fallan por el mismo motivo: a 9x9 píxeles no queda suficiente margen
para que la silueta se distinga sin ambigüedad, sobre todo en formas con
partes finas (espadas, llaves, agujas de brújula). La corrección no es
"redibujar con más cuidado" en el mismo grillado — es **subir la
resolución** a 11x11 o 13x13 para esos casos puntuales. El resto del set
(que ya funciona bien a 9x9) no hace falta tocarlo.
