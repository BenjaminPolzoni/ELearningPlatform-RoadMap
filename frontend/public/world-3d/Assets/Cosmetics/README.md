# Cosméticos 3D - Plataforma E-Learning

Esta carpeta contiene todos los cosméticos disponibles para el avatar de la plataforma.

## Estructura de la carpeta

```
3D/Assets/Cosmetics/
├── cosmetics.js       # Módulo con constructores 3D procedurales y catálogo de cosméticos
├── README.md          # Esta documentación
└── weapons/           # Modelos 3D GLTF de armas, escudos y carcajes medievales
    ├── sword_1handed.gltf
    ├── shield_badge.gltf
    ├── dagger.gltf
    ├── bow.gltf
    └── ... (67 archivos gltf, bin y png)
```

## Categorías de Cosméticos

### 🎒 Espalda (`backItem`, anclado al hueso `chest`)
- **Capa** (`cape`): Malla nativa del personaje
- **Mochila** (`backpack`): Color configurable
- **Bolso Notebook** (`laptop_bag`): Estilo bandolera cruzada con acento neón
- **Teclado Gamer** (`keyboard_back`): Arnés cruzado con teclado RGB
- **USB Gigante** (`giant_usb`): Pendrive invertido con conector metálico hacia arriba
- **Carcaj** (`quiver`): Malla nativa o modelo 3D con flechas
- **Carcaj Esquelético** (`Skeleton_Quiver.gltf`): Carcaj medieval esquelético con flechas

### 🧢 Cabeza (`headItem`, anclado al hueso `head`)
- **Auriculares Gamer** (`headphones`): Diadema con almohadillas y anillos RGB en orejas
- **Gorro Cóptero** (`propeller_hat`): Gorra clásica de 4 colores primarios con visera y hélice giratoria en tiempo real
- **Visor Saiyajin** (`saiyan_scouter`): Montura con lente holográfica verde
- **Anteojos Gamer** (`gamer_glasses`): Marco ergonómico oscuro con cristales cian envolventes y patillas curvas hasta las orejas
- **Gorro de Oso** (`bear_hat`): Gorro de piel ampliado un 15%
- **Casco** (`helmet`): Casco de caballero ampliado un 10% con visera metálica
- **Casco Esqueleto Guerrero** (`skel_helmet`): Casco cornudo de esqueleto guerrero
- **Sombrero Esqueleto Mago** (`skel_mage_hat`): Sombrero cónico puntiagudo de hechicero no-muerto
- **Capucha Esqueleto Pícaro** (`skel_hood`): Capucha oscura de asesino esqueleto

### ⚔️ Manos (`rightHandItem`, `leftHandItem`, anclado a `handslot.r` / `handslot.l`)
- **Mouse Gamer** (`mouse_gamer`): Mouse RGB con cable
- **Mate Argentino** (`mate_argentino`): Mate de calabaza con virola y bombilla
- **Bebida Energizante** (`energy_can`): Lata estilo Red Bull
- **Pokébola** (`pokeball`)
- **Patito de Goma** (`rubber_duck`)
- **Teclado Mecánico** (`keyboard_gamer`): Teclado 60% con teclas WASD y RGB animado
- **Armas Medievales**: Espadas, escudos, arcos, dagas, báculos, varitas, hachas en `weapons/`
- **Armamento Esquelético**: Espada Esquelética, Hacha Esquelética, Báculo Esquelético, Ballesta Esquelética, Escudos Grandes (A/B) y Pequeños (A/B)
- **Accesorios de Taberna**: Jarra de Cerveza Llena/Vacía (`mug_full.gltf`, `mug_empty.gltf`), Bomba de Humo (`smokebomb.gltf`)

### 💀 Arquetipos y Modelos Modulares Nuevos (`Assets/CharacterV2/Characters/gltf/`)
- **Esqueleto Guerrero** (`Skeleton_Warrior`): Armadura ósea, casco con cuernos y capa rasgada
- **Esqueleto Mago** (`Skeleton_Mage`): Túnica mística y cráneo con ojos brillantes
- **Esqueleto Pícaro** (`Skeleton_Rogue`): Capucha sigilosa y dagas
- **Esqueleto Minion** (`Skeleton_Minion`): Cráneo base no-muerto modular
- **Maniquí** (`Mannequin`): Modelo anatómico de entrenamiento neutral

### 🐾 Mascotas Voladoras (`pet`, flotan y orbitan al avatar)
- **Cyber Drone** (`drone`): Drone con 4 hélices animadas y LEDs de navegación
- **Búho Mágico** (`owl`): Búho con aleteo animado y ojos ámbar
- **Murciélago** (`bat`): Murciélago con aleteo animado
- **Fantasmita** (`ghost`): Fantasma con resplandor neón pulsante y cola ondulante
