# Paleta de referencia y cómo reemplazarla

## Paleta arcade original (placeholder)

Usada para diseñar y validar el set completo. **No es la paleta final del
proyecto** — es el punto de partida con el que se armó todo mientras el
equipo no tenía un sistema de diseño definido.

| Uso | Hex |
|---|---|
| Fondo | `#0D0B1E` |
| Panel | `#161328` |
| Panel secundario | `#1E1A38` |
| Acento primario (violeta) | `#8B5CF6` |
| Acento secundario (cian) | `#00E5FF` |
| Acento de contraste (magenta) | `#FF2E93` |
| Acento dorado | `#FFD60A` |
| Texto sobre fondo oscuro | `#F8FAFC` |
| Texto apagado / bordes secundarios | `#6B6785` |

## Checklist para encontrar el sistema de diseño real antes de usar esto

Correr esta búsqueda ANTES de generar cualquier ícono nuevo para el
proyecto real (no para mockups de exploración). **El proyecto no usa
Angular Material** — la paleta vive en Tailwind/daisyUI o en variables
SCSS propias. Revisar en este orden:

1. **Tailwind + daisyUI** (confirmado como elección del equipo, ver sprint
   0 — "implementar daisyUI con nuestra paleta"): buscar
   `tailwind.config.js` / `.ts` / `.cjs`. El bloque `daisyui: { themes:
   [...] }` trae las variables semánticas del tema activo (`primary`,
   `secondary`, `accent`, `neutral`, `base-100`, `base-200`...), que
   daisyUI también expone como variables CSS en runtime (`--p`, `--s`,
   `--a`...). Si el tema es custom (no uno de los predefinidos de daisyUI),
   va a estar declarado ahí mismo con sus valores hex.
2. **Variables CSS / SCSS propias**: si no hay daisyUI o el equipo migró a
   variables propias, buscar `:root { --color-... }` en `src/styles.scss`
   (el archivo de estilos globales que genera Angular CLI por default) o en
   un `_variables.scss` aparte.
3. **Archivo de tokens dedicado**: `design-tokens.*`, `theme.*` dentro de
   `src/` — algunos proyectos centralizan la paleta ahí en vez de en el
   config de Tailwind.

Si aparece cualquiera de estos, generar los íconos con esos colores, no con
`PALETTE_ARCADE`. Si el proyecto no tiene nada de esto todavía, usar
`PALETTE_ARCADE` como placeholder y decirle explícitamente al usuario que
es un placeholder, no una decisión de diseño final.

## Cómo mapear paleta real → roles usados en las grillas

Las grillas no dependen de nombres de color específicos, solo de roles.
Al recolorear, mantener la misma lógica de roles:

- **outline** (color `1` en casi todas las grillas): normalmente el más
  oscuro/neutro del sistema — en un sistema con fondo claro, puede no ser
  negro puro, sino el color de borde/texto principal del proyecto.
- **fill principal** (color `2`): el color "de marca" del ícono — para
  vidas suele ser un rojo/magenta asociado a "salud"; para insignias, el
  acento que el proyecto use para logros/premios si existe uno dedicado.
- **highlight** (color `3`): blanco o el tono más claro disponible, para el
  brillo/reflejo que le da la sensación de volumen al pixel art.
- **acento secundario** (color `4`, solo en algunas grillas): variación
  para detalles internos (ej. la gema del escudo, la aguja de la brújula).

No hace falta que los 4 roles existan siempre — varias grillas usan solo 2
o 3 colores.
