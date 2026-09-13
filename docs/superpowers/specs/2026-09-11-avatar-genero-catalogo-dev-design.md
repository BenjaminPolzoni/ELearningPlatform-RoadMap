# Avatar: género y catálogo orientado a programadores

**Fecha:** 2026-09-11
**Rama de trabajo:** `pruebas-iker`

## 1. Contexto

El avatar del alumno es un sprite pixel-art SVG de grilla 16×22
([`avatar-sprite.ts`](../../../frontend/src/app/shared/ui/avatar-sprite.ts)) configurado por
ids de catálogo ([`avatar.models.ts`](../../../frontend/src/app/core/avatar/avatar.models.ts)),
persistido en localStorage ([`avatar.service.ts`](../../../frontend/src/app/core/avatar/avatar.service.ts))
y editado en `/alumno/avatar`
([`avatar-editor.ts`](../../../frontend/src/app/features/alumno/avatar-editor.ts)). Lo consumen
el HUD, el mapa 2.5D, el tablero de unidad y el ranking (el resto de la cohorte recibe un
avatar determinístico de `avatarConfigMock`, en `mocks/ranking.seed.ts`).

Hoy tiene 4 partes (piel, pelo, color de traje, accesorio) y una única silueta.

Este cambio:

1. Agrega **género** — mujer · varón · indefinido — que cambia la **silueta** del sprite y
   los **valores sugeridos** de RESET. No filtra el catálogo: todo está disponible para
   los tres.
2. Amplía el catálogo con elementos **orientados a programadores**: tipo de prenda,
   emblema de pecho, anteojos, objeto en mano, barba, más peinados, más accesorios de
   cabeza, colores de pelo naturales y colores de ropa "dev".
3. Reorganiza el editor en **pestañas**.

Todo es frontend. El backend no se toca (el avatar no viaja todavía; en Fase 3 lo hará como
parte del perfil del BFF, y lo que viaje seguirán siendo ids).

**Fuera de alcance:** desbloqueo de ítems por nivel/XP (todo disponible desde el inicio),
mascota/compañero, i18n (el editor ya hardcodea sus textos; ver §8).

## 2. Enfoque

Se sigue el patrón actual del sprite: **un `@switch` por capa en el template**. Para que el
template no se vuelva ilegible, se extrae a `shared/ui/avatar-sprite.html` (`templateUrl`) y
se ordena en bloques por capa, cada uno con un comentario de cabecera. La API pública del
componente (`config`, `alto`, `caminando`, `celebrando`, `mirando`, `sombra`, `etiqueta`)
**no cambia**: ningún consumidor se toca.

La grilla sigue siendo 16×22 y lo persistido siguen siendo ids, nunca hex.

## 3. Modelo y catálogo (`core/avatar/avatar.models.ts`)

### 3.1 `AvatarConfig`

| Campo | Tipo | Opciones |
|---|---|---|
| `genero` **(nuevo)** | `IdGenero` | `mujer` · `varon` · `indefinido` |
| `piel` | `IdPiel` | sin cambios (6) |
| `pelo` | `IdPelo` | `corto` · `largo` · `cresta` · `rapado` · `afro` + **`rodete` · `coleta` · `despeinado`** |
| `colorPelo` | `IdColor` | de `COLORES_PELO` |
| `barba` **(nuevo)** | `IdBarba` | `ninguna` · `barba` · `bigote` · `candado` — se pinta con `colorPelo` |
| `prenda` **(nuevo)** | `IdPrenda` | `traje` (el mono actual) · `hoodie` · `remera` · `camisa` (con corbata) · `campera` (abierta, remera debajo) |
| `colorRopa` **(renombrado de `colorTraje`)** | `IdColor` | de `COLORES_ROPA` |
| `emblema` **(nuevo)** | `IdEmblema` | `ninguno` · `cuadro` (el actual) · `tag` (`</>`) · `llaves` (`{}`) · `prompt` (`>_`) · `lambda` (`λ`) · `punto-y-coma` (`;`) · `hash` (`#`) |
| `accesorio` | `IdAccesorio` | `ninguno` · `visor` · `gorra` · `corona` · `auriculares` + **`beanie` · `gorra-atras` · `headset`** (auriculares con micrófono) |
| `colorAccesorio` | `IdColor` | de `COLORES_ROPA` |
| `anteojos` **(nuevo)** | `IdAnteojos` | `ninguno` · `marco-grueso` · `redondos` · `sol` · `codigo` (lentes con reflejo de código verde) — colores fijos |
| `objeto` **(nuevo)** | `IdObjeto` | `ninguno` · `laptop` (tapa con stickers) · `cafe` · `mate` · `teclado` — colores fijos |

`colorTraje` se renombra a `colorRopa` porque "traje" pasa a ser una de las prendas y el
nombre viejo quedaría ambiguo.

### 3.2 Colores

Un único registro `COLORES` con ids únicos (base + sombra precalculada, como hoy), y dos
listas que referencian ids de ese registro:

- **`COLORES_PELO`** = naturales + marca: `negro` · `castaño` · `rubio` · `pelirrojo` ·
  `canoso` · (los 6 de marca actuales).
- **`COLORES_ROPA`** = marca + dev: (los 6 de marca actuales) · `verde-terminal` ·
  `grafito` · `negro`.

`negro` es el mismo color en ambas listas (una sola entrada en el registro). Los hex
concretos se ajustan en implementación con verificación visual; lo que se fija acá es la
familia de cada uno. Los naturales de pelo quedan por fuera de la paleta de marca por la
misma razón que los tonos naturales de piel.

### 3.3 Defaults por género

`avatarPorDefecto(genero: IdGenero): AvatarConfig` reemplaza al uso directo de
`AVATAR_POR_DEFECTO`. Los tres comparten piel `media`, `colorPelo` `castaño`, prenda
`hoodie` en `violeta`, emblema `tag`, `colorAccesorio` `rosa` y el resto de las ranuras en
`ninguno`/`ninguna`; difieren en el peinado: mujer `largo`, varón `corto`, indefinido
`despeinado`.

Cuándo se aplican:

- **Usuario nuevo** (nada guardado): `avatarPorDefecto('indefinido')`.
- **RESET**: `avatarPorDefecto(genero actual)` — conserva el género elegido.
- **Cambiar de género en el editor**: cambia **solo** la silueta; el resto de lo elegido
  queda igual.
- **AL AZAR**: sortea todas las ranuras, incluido el género, cada color de su propia lista.

### 3.4 `sanearAvatar` y migración

Regla: **campo ausente** = avatar guardado con una versión anterior → se completa con el
**look clásico**, para que quien ya tenía avatar lo siga viendo igual. **Id presente pero
desconocido** (o de una lista que no le corresponde) → default del género.

| Campo | Ausente | Desconocido |
|---|---|---|
| `genero` | `indefinido` | `indefinido` |
| `prenda` | `traje` | default del género |
| `emblema` | `cuadro` | default del género |
| `colorRopa` | valor de `colorTraje` si es válido, si no default | default del género |
| `barba`, `anteojos`, `objeto` | `ninguno`/`ninguna` | `ninguno`/`ninguna` |
| resto | default del género | default del género |

`colorPelo` se valida contra `COLORES_PELO` y `colorRopa`/`colorAccesorio` contra
`COLORES_ROPA`: un `verde-terminal` en `colorPelo` se descarta.

La silueta `indefinido` es la silueta actual, así que un avatar viejo migrado (indefinido +
traje + cuadro) se ve igual que antes — con la única diferencia del cuello nuevo (§4.1),
que ganan las tres siluetas.

## 4. Sprite (`shared/ui/avatar-sprite.ts` + `.html`)

### 4.1 Siluetas

Mismas manos (`x=2` y `x=12`, `y=16`) y mismas piernas en las tres, para que el objeto en
mano y los zapatos calcen siempre.

| Silueta | Diferencias sobre la base |
|---|---|
| `indefinido` | la silueta actual: torso recto, mentón cuadrado, sin cejas ni pestañas, boca neutra |
| `varon` | hombros anchos (fila `y=11` del torso se extiende sobre los brazos), cuello de 4 px, cejas (`colorPelo` sombra) |
| `mujer` | cintura marcada (torso se angosta en `y=14..15`), mentón redondeado, cuello de 2 px, pestañas en el borde externo de los ojos, labios en rosa |

Las tres ganan un **cuello** (`y=10`), que hoy es una fila vacía entre cabeza y torso.

### 4.2 Orden de capas

sombra en el piso → piernas (traje: color de la ropa; otras prendas: pantalón) y zapatos
→ torso según silueta → brazos, mangas y manos (hombros anchos del varón) → detalles de la
prenda (capucha y cordones del hoodie, cuello de remera, cuello y corbata de camisa, remera
y bordes de la campera abierta) → emblema → cuello y cabeza → cara (ojos, cejas o
pestañas, boca) → barba → pelo (incluye el largo y la coleta, que asoman por los costados)
→ anteojos → accesorio de cabeza → objeto en mano.

Los brazos van antes que los detalles de la prenda para que las mangas cortas de la remera
y los hombros del varón queden debajo del cuello de camisa y de la campera. La capucha del
hoodie ocupa las filas `y=9..10` alrededor del cuello, así que no necesita una capa trasera
propia: la cabeza y el cuello, que se dibujan después, la tapan donde corresponde.

### 4.3 Reglas de convivencia

Se resuelven en el componente (con `computed`), igual que las reglas de contraste actuales:

1. **Accesorios que cubren la cabeza** (`gorra`, `gorra-atras`, `beanie`) pintan todo el
   casco (filas `y=0..3`), así ningún peinado (cresta, rodete) lo atraviesa.
2. **Visor** tapa los ojos: con `visor`, los `anteojos` no se dibujan.
3. **Emblema oculto** con prenda `camisa` (la corbata ocupa el centro) y con objeto
   `laptop` (va sostenida delante del pecho).
4. **Campera** va abierta: el emblema se dibuja sobre la remera de debajo.
5. **Emblema legible al caminar a la izquierda**: el sprite se espeja con `scaleX(-1)`, lo
   que invertiría `λ`, `>_`, `;`. El grupo del emblema lleva un contra-espejado
   (`translate(16,0) scale(-1,1)`) cuando `mirando() === 'izquierda'`. Está centrado en
   `x=8`, así que no se desplaza.
6. **Contraste** (se mantienen): el emblema va en rosa de marca salvo que la ropa sea `rosa`
   o `rosa-pastel` (entonces hueso); los zapatos van en hueso salvo que la ropa sea `hueso`
   (entonces noche).

## 5. Editor (`features/alumno/avatar-editor.ts`)

- Layout de dos columnas como hoy. La **vitrina** (preview + AL AZAR + RESET) queda
  `sticky` a la izquierda.
- A la derecha, **4 pestañas** con estilo arcade (`ui-font`), `role="tablist"` /
  `role="tab"` / `aria-selected` / `role="tabpanel"`. La pestaña activa es un `signal`
  local, no se persiste, y arranca en CUERPO.

| Pestaña | Secciones |
|---|---|
| CUERPO | Género (MUJER · VARÓN · INDEFINIDO) · Tono de piel · Pelo + color (naturales, separador, marca) · Barba |
| ROPA | Prenda · Color (9 muestras) · Emblema (chips con el glifo en fuente mono) |
| ACCESORIOS | Cabeza + color (el color solo si hay accesorio, como hoy) · Anteojos |
| EQUIPO | Objeto en mano |

- **Avisos en contexto** (texto chico, no bloquean): en Emblema, cuando la camisa o la
  laptop lo ocultan; en Anteojos, cuando hay visor.
- `elegirColor` se generaliza al nuevo set de campos de color.

## 6. Servicio y ranking

- **`AvatarService`**: `set` sin cambios. `reiniciar()` → `avatarPorDefecto(genero actual)`.
  `aleatorio()` cubre todas las ranuras con su lista correspondiente. `leer()` usa
  `avatarPorDefecto('indefinido')` si no hay nada guardado y `sanearAvatar` si lo hay. La
  clave de localStorage (`mock-avatar`) no cambia.
- **`avatarConfigMock`** (ranking): hoy deriva todo de un único hash de 32 bits a 3 bits por
  campo; con 12 campos no alcanza. Pasa a un hash por campo (`seed + ':' + campo`). Sigue
  siendo determinístico y siempre válido; los avatares mock de la cohorte cambian de look
  una única vez.

## 7. Testing

Vitest (`ng test`):

- **`core/avatar/avatar.models.spec.ts`**
  - avatar viejo (sin `genero`, `prenda`, `emblema`; con `colorTraje`) → `indefinido`,
    `traje`, `cuadro`, `colorRopa` = `colorTraje`, ranuras nuevas en `ninguno`/`ninguna`.
  - id desconocido → default del género.
  - color válido de ropa en `colorPelo` (`verde-terminal`) → se descarta.
  - `avatarPorDefecto` de cada género pasa por `sanearAvatar` sin cambios.
  - `sanearAvatar(null)` → `avatarPorDefecto('indefinido')`.
- **`core/avatar/avatar.service.spec.ts`**: RESET conserva el género; AL AZAR siempre
  produce una config que `sanearAvatar` deja igual.
- **`avatarConfigMock`**: determinístico (misma semilla → misma config) y válido para los
  12 alumnos del seed.
- **Sprite**: verificación visual en el navegador (dev server): las tres siluetas; cada
  categoría nueva; las reglas de convivencia 1–5; el sprite en HUD, mapa y ranking.

## 8. Documentación y deuda técnica

- `path/05-design-system.md` §"El avatar del alumno": actualizar la tabla de partes y
  agregar las reglas de convivencia.
- Registrar en `path/deuda-tecnica/` (siguiendo `path/deuda-tecnica/AGENTS.md`) que el
  editor de avatar, como el resto del frontend, tiene los textos hardcodeados pese a
  RF-NFR-07 (i18n desde el día 1) — no está registrado hoy.
