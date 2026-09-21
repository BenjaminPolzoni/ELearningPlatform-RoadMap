# Feature `roadmap` (G10)

Todo el código del roadmap vive en esta carpeta, con la misma forma que tendrá en el front del TPI
(`src/app/features/roadmap/`). La única pieza que la app conoce es `roadmap.routes.ts`
(`ROADMAP_ROUTES`), que se monta bajo `/roadmap`.

## Estructura

```text
roadmap/
├── roadmap.routes.ts        Rutas (relativas a /roadmap). El padre trae el layout y los providers.
├── roadmap.providers.ts     Puertos de datos -> adaptadores. Es lo único que cambia en la Fase 3.
├── pages/                   Componentes contenedor (uno por ruta): <nombre>-page/<nombre>-page.component.ts
├── ui/                      Componentes de presentación y sus datos visuales (íconos, etiquetas)
├── data-access/             Estado y acceso a datos, por concepto
│   ├── roadmap/             Puerto, adaptador en memoria, modelos, store y biomas
│   ├── ranking/  badges/  bank/  avatar/  educa/  tutorial/
│   ├── session/  theme/  feedback/   Servicios de apoyo (sesión mock, tema, avisos)
│   └── mocks/               Semillas de datos de desarrollo (se borran con los adaptadores en memoria)
├── domain/                  Reglas puras, sin Angular: ranking, geometría iso, generación de mundos, quiz
└── engine/                  Motores three.js (mundo 3D, archipiélago, avatar modular, tienda)
```

Los assets estáticos están en `src/assets/roadmap/` (se sirven en `/assets/roadmap/...`):
`world-3d/` (el mundo 3D embebido en un iframe), `world/` (modelos hexagonales) e `img/`.

## Convenciones aplicadas

- Todo en inglés salvo el texto que ve el usuario (ver `ui/labels.ts` para las etiquetas de los enums).
- Nombres en kebab-case con sufijo: `*.component.ts`, `*.service.ts`, `*.store.ts`, `*.models.ts`, `*.routes.ts`.
- Los tests están junto a lo que prueban (`*.spec.ts`) y importan `describe/it/expect/vi` de `vitest`,
  para no depender de los tipos globales del runner.
- Los puertos de datos y los servicios que dependen de ellos se proveen en la ruta
  (`roadmap.providers.ts`), no en `app.config.ts`.

## Contrato con el iframe 3D

`src/assets/roadmap/world-3d/index.html` y `world-3d-page` se hablan por `postMessage`.
Los nombres de los mensajes y de sus campos son parte del contrato: hay que cambiarlos en los dos lados.

- Angular → 3D: `setSections` (`sections`, `xpTotal`, `currentLives`, `streakDays`), `celebrateProgress`, `tutorialControl`.
- 3D → Angular: `enterActivity`, `openUnitPlay`, `openRanking`, `openMaterials`, `tutorialScene`, `tutorialMoved`, `celebrationStarted`.

## Pendiente para integrarlo en el monolito

- **Datos**: reemplazar los adaptadores `InMemory*` por adaptadores HTTP con `HttpGenericService` y mapear
  los nombres de campo contra el contrato real del back de TPI (los modelos actuales espejan el back viejo).
- **Sesión**: `data-access/session/` es un login mock que guarda el rol en `localStorage`, algo que
  el AGENTS.md prohíbe. Se reemplaza por el `AuthService` del core (y `pages/dev-login-page` se elimina).
- **UI institucional**: `ui/educa-ui` (botón, badge, card) duplica componentes de `@2026-p4-fe/ui`.
- **Estilos**: el look arcade usa Tailwind + daisyUI y `src/styles.css`, que no están en el front de TPI.
  Hay que decidir cómo se incorporan.
- **Lint y formato**: el código todavía no cumple `npm run lint:all` de TPI (ESLint tipado, Prettier, Stylelint).
- **Componentes conectados**: varios componentes de `ui/` inyectan servicios (`ranking-panel`, `avatar-panel`,
  `inventory-modal`, `hud`, `node-canvas`, `save-feedback-toast`, `ranking-detail`, `dungeon-shop-modal`) y deberían pasar a recibir
  datos por `input()` desde su página.
- **Código sin usar**: no se alcanza desde las rutas `pages/role-home-page`, `pages/course-editor-page`,
  `pages/section-editor-page`, `pages/student-map-page` y los componentes que solo usan esas páginas.
