# Contrato del avatar GLB aprobado

El archivo definitivo vive en esta carpeta con este nombre exacto:

`avatar-low-poly-approved.glb`

Fue generado como malla low-poly propia a partir de la dirección visual aprobada. Los
modelos de `Assets/Character/` pertenecen al paquete anterior y no se utilizan como
sustituto.

La fuente reproducible está en `frontend/tools/avatar/build_avatar.py`. Blender se usa
solo como herramienta externa de autoría; no se instala ni se empaqueta con la web.

## Jerarquía obligatoria

El GLB debe exportar un nodo raíz `Avatar`. Cada slot contiene como hijos directos las
variantes intercambiables. El identificador de cada variante puede estar en la propiedad
personalizada `variant` o al final del nombre del nodo, por ejemplo `Hair__a`.

```text
Avatar
├── Rig
├── Body
│   ├── Body__male
│   └── Body__female
├── Hair
│   ├── Hair__a
│   └── Hair__b
├── Top
│   ├── Top__tshirt
│   └── Top__hoodie
├── Bottom
│   ├── Bottom__jogger
│   └── Bottom__cargo
├── Shoes
│   ├── Shoes__sneakers
│   └── Shoes__high-top
├── HeadAccessory
├── FaceAccessory
├── HandAccessory
├── BackAccessory
├── WaistAccessory
├── ShoulderAccessory
└── Details (opcional)
```

Los slots de accesorios pueden estar vacíos. Para los demás slots debe existir al menos
una variante. Todas las prendas y variantes corporales animables deben estar vinculadas
al mismo rig.

## Colores

Para que los selectores de color funcionen, cada mesh o material tintable debe declarar
una propiedad personalizada `colorSlot` con uno de estos valores:

- `skin`
- `hair`
- `top`
- `bottom`
- `shoes`

Como compatibilidad, el cargador también reconoce esos términos en nombres de meshes o
materiales. Ojos, boca, emblemas y demás zonas que no deban cambiar de color no deben
llevar `colorSlot`.

## Animaciones y presupuesto

- Clips recomendados: `idle`, `walk` y `sprint`.
- Escala de autoría: metros; pies apoyados en `Y = 0`.
- Orientación frontal: `+Z`.
- 3.000–6.000 triángulos para la base; máximo 10.000 en una configuración equipada.
- Un esqueleto común.
- Uno o dos materiales, con una textura atlas pequeña.
- Sin físicas, transparencias complejas ni shaders personalizados pesados.

El resultado actual tiene 3.000 triángulos en la base equipada, un material, un
esqueleto y los clips `idle`, `walk` y `sprint`. El cargador valida jerarquía,
triángulos, materiales y esqueletos al abrir el archivo. Un GLB inválido no se muestra
silenciosamente: el personalizador informa el problema.
