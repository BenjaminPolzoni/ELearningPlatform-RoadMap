# 04 · Engine 2.5D del mapa de islas

> Squad **Engine**. Referencia visual: `assets/estilo_roadmap.jpeg`
> (antes `Fotos_y_conceptos/VistaDeLasUnidadesRoad.jpeg`, hoy con la paleta de marca —
> ver [`05-design-system.md`](05-design-system.md) §1).

> ⚠️ **Estado real:** el mapa que corre hoy **no usa three.js**. Está resuelto con
> proyección isométrica calculada a mano y render SVG —
> `frontend/src/app/core/iso/iso.ts` + `features/alumno/mapa.ts`— porque así cada isla
> queda como nodo del DOM (foco y `aria-label`, 05 §8) y el front no carga ~600 kB de
> three.js. **Lo que sí se respeta de este documento es el §4**: la posición siempre se
> calcula, con ruido determinista por índice y reflow al agregar/quitar unidades; el
> `layoutIslas()` implementado devuelve coordenadas de mundo, así que se reutiliza tal
> cual el día que entre el engine. Registrado en
> [`deuda-tecnica/tarea-deuda-04-engine-2-5d.md`](deuda-tecnica/tarea-deuda-04-engine-2-5d.md).
> Las secciones §3, §5 y §6 de acá abajo describen el engine **objetivo**, no lo que corre.

## 1. Qué tiene que lograr

1. Renderizar cada **unidad del curso como una isla** flotante en perspectiva isométrica
2. **Reflowear solo** cuando el profesor agrega o quita unidades — sin tocar código
3. Conectar las islas con **caminos neón** que indican el orden del recorrido
4. Mostrar el **estado** de cada isla: bloqueada · disponible · completada
5. Permitir paneo horizontal y entrar a una unidad con click
6. Sostener **60 fps** con hasta 12 unidades

---

## 2. Decisión de render

**Pixel-art 2.5D con sprites sobre cámara ortográfica.**

No es 3D con geometría: son **quads texturizados** ubicados en el espacio 3D y vistos con una
cámara ortográfica en ángulo isométrico. Eso da la profundidad de la referencia manteniendo el
pixel crocante.

> **Regla clave:** el arte es un catálogo finito de variantes de isla. La **posición siempre se
> calcula**. Si el arte estuviera "pegado" a una composición fija, agregar la unidad 7 rompería
> el mapa — y ese es justamente el requerimiento central.

---

## 3. Setup de la escena

### Cámara isométrica

```ts
const aspect = width / height;
const d = 20;                                   // "zoom": mitad del alto visible
const camera = new THREE.OrthographicCamera(
  -d * aspect, d * aspect, d, -d, 0.1, 1000
);
camera.position.set(20, 20, 20);                // ángulo isométrico clásico
camera.lookAt(0, 0, 0);
```

En el `resize` hay que recalcular `left/right/top/bottom` y llamar
`camera.updateProjectionMatrix()` — con ortográfica no alcanza con tocar el aspect.

### Texturas pixel-art

Sin esto el sprite sale borroso y se pierde todo el estilo:

```ts
const texture = await new THREE.TextureLoader().loadAsync(url);
texture.magFilter = THREE.NearestFilter;
texture.minFilter = THREE.NearestFilter;
texture.generateMipmaps = false;
texture.colorSpace = THREE.SRGBColorSpace;
```

### Islas como quads

```ts
const geo = new THREE.PlaneGeometry(w, h);
const mat = new THREE.MeshBasicMaterial({
  map: texture,
  transparent: true,
  alphaTest: 0.5,          // evita halos y problemas de orden de dibujado
  depthWrite: true,
});
const isla = new THREE.Mesh(geo, mat);
isla.rotation.x = -Math.PI / 4;   // billboard inclinado hacia la cámara iso
```

**Orden de dibujado:** las islas más "adelante" (mayor `z`) se dibujan encima.
Se resuelve con `renderOrder` asignado por el índice de layout, no con `depthTest` solo.

---

## 4. Layout procedural — el corazón del engine

Las unidades se acomodan sobre una **serpentina**. Es determinista, así que la misma unidad
cae siempre en el mismo lugar.

> **Corrección respecto del snippet de abajo:** el layout implementado
> (`core/iso/iso.ts`, `layoutIslas()`) no usa filas que alternan dirección sino una **cinta
> que avanza hacia la derecha con zig-zag vertical**, porque el mapa se recorre con paneo
> horizontal (§9) y un bloque que crece hacia abajo pelea contra eso.
>
> Y una trampa que este snippet tiene y que costó encontrar: parametrizar el zig-zag
> directo en `x`/`y` de mundo **no funciona**. Como la proyección resta (`pantallaX ∝ x − y`),
> un offset simétrico en mundo se amplifica en horizontal y termina apilando islas encima
> de las anteriores. El layout real se parametriza en los **ejes de pantalla** (`u = x − y`
> horizontal, `w = x + y` vertical) y recién después convierte a mundo.

```ts
interface LayoutOpts {
  perRow?: number;    // islas por fila antes de doblar
  spacingX?: number;
  spacingZ?: number;
  jitter?: number;    // desorden para que no parezca una grilla
}

export function layoutIslas(n: number, o: LayoutOpts = {}): THREE.Vector3[] {
  const { perRow = 4, spacingX = 14, spacingZ = 11, jitter = 2.2 } = o;
  const out: THREE.Vector3[] = [];

  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    // filas impares van al revés → serpentina
    const dir = row % 2 === 0 ? col : perRow - 1 - col;

    // ruido determinista por índice: mismo input, mismo output
    const r = Math.sin(i * 127.1) * 43758.5453;
    const jx = ((r - Math.floor(r)) - 0.5) * jitter;
    const r2 = Math.sin(i * 311.7) * 43758.5453;
    const jz = ((r2 - Math.floor(r2)) - 0.5) * jitter;

    out.push(new THREE.Vector3(
      dir * spacingX + jx,
      0,
      row * spacingZ + jz,
    ));
  }
  return out;
}
```

### Variante de arte por unidad

```ts
const ISLA_VARIANTES = ['bosque', 'volcan', 'hielo', 'cristal', 'ruinas', 'nube'];
const variante = ISLA_VARIANTES[unidad.orden % ISLA_VARIANTES.length];
```

Con 6 variantes y hasta 12 unidades, ninguna consecutiva se repite.

---

## 5. Caminos neón

**No van pintados en el sprite.** Se generan en engine — así es como conseguimos el look de la
referencia sin necesitar arte neón específico, y así el camino se adapta solo al layout.

```ts
const curva = new THREE.CatmullRomCurve3(posiciones, false, 'catmullrom', 0.4);
const geo = new THREE.TubeGeometry(curva, posiciones.length * 12, 0.18, 8, false);
const mat = new THREE.MeshBasicMaterial({
  color: 0x00e5ff,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
```

**Color según progreso** (igual que la referencia, donde el tramo recorrido va en verde):

| Tramo | Color |
|---|---|
| Ya completado | `#39FF88` verde neón |
| Siguiente disponible | `#00E5FF` cyan |
| Bloqueado | `#6B7285` gris, opacidad 0.35 |

---

## 6. Post-proceso: el bloom es el que pone el "arcade"

```ts
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(
  new THREE.Vector2(width, height),
  0.85,   // strength
  0.4,    // radius
  0.85,   // threshold — solo brillan los píxeles ya luminosos
));
```

> Ajustar `threshold` con cuidado: si baja demasiado, el pixel-art se lava entero.
> Solo los caminos, los íconos de estado y los acentos deberían brillar.

---

## 7. Integración con Angular

Dos cosas que si se hacen mal duelen: el change detection y las fugas de memoria.

```ts
@Component({ selector: 'app-mapa-islas', standalone: true, template: `<canvas #cv></canvas>` })
export class MapaIslasComponent implements AfterViewInit, OnDestroy {
  private readonly zone = inject(NgZone);
  private raf = 0;

  unidades = input.required<Unidad[]>();

  ngAfterViewInit() {
    // el render loop NUNCA debe disparar change detection
    this.zone.runOutsideAngular(() => this.iniciar());
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.raf);
    this.renderer.dispose();
    this.scene.traverse(o => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
      }
    });
    this.texturas.forEach(t => t.dispose());
    this.composer.dispose();
  }
}
```

- Si el proyecto arranca **zoneless** (`provideZonelessChangeDetection()`), el `runOutsideAngular`
  es innecesario pero inofensivo. Confirmar cómo quedó el bootstrap en Fase 0.
- El `input()` de `unidades` se observa con un `effect()` que **reconstruye el layout** cuando
  el profesor agrega o quita una unidad. Ese es el enganche con el editor.
- Lazy-load del módulo del mapa: three.js no debe entrar en el bundle inicial.

---

## 8. Assets

### Estrategia en dos tiempos

**Ahora — programmer-art.** Quads de color plano con la paleta arcade y un label de texto.
El layout, los caminos, el bloom, el click y la cámara se construyen y se prueban igual.
Nadie queda bloqueado esperando arte.

**Después — swap.** Se reemplaza el `TextureLoader` por un **atlas** y no se toca nada más,
porque el resto del engine solo conoce índices de variante.

### Fuentes recomendadas

| Fuente | Licencia | Uso |
|---|---|---|
| [Kenney.nl](https://kenney.nl) | **CC0** | Base isométrica. Cero riesgo de licencia para una entrega de facultad |
| itch.io | variable | Solo si se revisa la licencia y se documenta en `docs/` |

> ⚠️ **Registrar la licencia de todo asset que entre al repo**, en `docs/ASSETS.md`.
> Es un trabajo académico que se entrega y se presenta.

### Rendimiento

- Todos los sprites en **un solo atlas** → un `draw call` por material
- `frustumCulled = true` en las islas fuera de cámara
- Presupuesto: **60 fps con 12 unidades**. Si no da, primero se recorta el bloom, no el arte

---

## 9. Interacción

| Acción | Resultado |
|---|---|
| Paneo horizontal (drag / flechas / botón *siguiente zona*) | La cámara se mueve dentro de los límites del layout |
| Hover sobre isla | Highlight + tooltip con nombre y umbral de XP |
| Click en isla **disponible** | Transición al mapa interno de la unidad |
| Click en isla **bloqueada** | Tooltip: *"Necesitás N XP en la unidad anterior"* |
| Scroll | Zoom acotado (`d` entre 12 y 34) |

Los límites de cámara se derivan del bounding box del layout, así que crecen solos cuando se
agregan unidades.

---

## 10. Checklist del squad

- [ ] Escena, cámara ortográfica isométrica, resize correcto
- [ ] `layoutIslas()` con tests unitarios (determinismo y no-solapamiento)
- [ ] Islas con placeholders y estados visuales
- [ ] Caminos con `CatmullRomCurve3` y color por progreso
- [ ] Bloom calibrado sin lavar el pixel-art
- [ ] Paneo, zoom acotado, hover y click
- [ ] Integración con `input()` de unidades + `effect()` de reflow
- [ ] `ngOnDestroy` que libera geometrías, materiales, texturas y composer
- [ ] Lazy-load del módulo
- [ ] Medición de fps con 12 unidades
