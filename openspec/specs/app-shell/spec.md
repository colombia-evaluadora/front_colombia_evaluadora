# app-shell Specification

## Purpose
Describe cómo se construye, sirve y arranca la aplicación (`vite.config.ts`, `src/main.tsx`, `worker/index.js`, `wrangler.jsonc`).

## Requirements

### Requirement: Servido por Cloudflare Worker
El Worker SHALL reenviar `/api` y `/api/*` a `API_PROXY_TARGET` preservando `Set-Cookie`, servir el resto desde `env.ASSETS` como SPA y MUST agregar `Cache-Control: no-store` a toda respuesta de `/api` (BE-10).

#### Scenario: Request a la API
- **WHEN** el navegador hace `POST /api/eval-col/...`
- **THEN** el Worker lo reenvía al gateway del entorno (mismo origen, sin CORS)
- **AND** la respuesta lleva `Cache-Control: no-store`

#### Scenario: Navegación a una ruta de la SPA
- **WHEN** el navegador pide `/app/planeador/actividades`
- **THEN** el Worker sirve `index.html` desde los assets

### Requirement: Arranque con MSW opcional
`main.tsx` SHALL iniciar el worker de MSW antes de renderizar cuando `VITE_APP_ENABLE_API_MOCKING` es `active` (entorno `dev`), registrando un Service Worker en scope `/`.

#### Scenario: Entorno dev con mocks
- **WHEN** la app arranca con mocks activos
- **THEN** MSW se registra en scope `/` y atiende las requests `/api/*`

### Requirement: Endpoint de salud
El backend SHALL exponer `GET /eval-col/health` sin autenticación, liviano y con respuesta JSON, y el front MUST tratarlo como endpoint no autenticado y probe (sin toast).

#### Scenario: Heartbeat sin sesión
- **WHEN** el heartbeat llama `/api/eval-col/health` sin token
- **THEN** responde 200 JSON y no se adjunta Bearer ni se muestra toast si falla

### Requirement: Service Worker de app shell
El build SHALL registrar un Service Worker (`vite-plugin-pwa`, `injectManifest`) que precachea todos los assets de `dist/` y responde navegaciones con `index.html`, y MUST NOT cachear ni interceptar requests a `/api`.

#### Scenario: Recarga sin red
- **WHEN** el usuario recarga `/app/planeador/actividades` sin conexión tras haberla visitado online
- **THEN** el shell y los chunks se sirven desde el precache

#### Scenario: Verificación pública de boletín
- **WHEN** se abre `/verificar/b/<codigo>` sin red en un equipo con la PWA
- **THEN** se sirve el shell y se muestra "No pudimos verificar el boletín porque no hay conexión. Intenta de nuevo cuando tengas internet."
- **AND** nunca se muestra un estado de verificación cacheado

### Requirement: Aviso de nueva versión
El SW SHALL usar `registerType: "prompt"` y mostrar un toast persistente "Hay una nueva versión de Colombia Evaluadora." con botón "Actualizar"; MUST NOT activar la nueva versión automáticamente mientras haya una sincronización en curso u operaciones pendientes.

#### Scenario: Deploy con pendientes
- **WHEN** hay una versión nueva y la outbox tiene operaciones pendientes
- **THEN** "Actualizar" queda deshabilitado con "Termina de sincronizar para actualizar" y se aplica al terminar el lote

### Requirement: Kill-switch del Service Worker
El sistema SHALL poder desactivar el offline con un flag remoto o de build (`off | read | full`) y con un build de emergencia cuyo SW se desregistra, borra sus caches y recarga los clientes, MUST NOT borrar IndexedDB y MUST servir `/sw.js` con `Cache-Control: no-cache`.

#### Scenario: SW defectuoso en producción
- **WHEN** se despliega el build de emergencia
- **THEN** los clientes desregistran el SW en su próxima carga y conservan la outbox

#### Scenario: Flag en off
- **WHEN** el flag remoto vale `off`
- **THEN** no se persisten queries y solo se muestra el banner de conectividad

### Requirement: Convivencia con MSW
El SW de la PWA MUST NOT registrarse cuando los mocks de MSW están activos (entorno `dev`).

#### Scenario: Entorno dev
- **WHEN** la app arranca con `VITE_APP_ENABLE_API_MOCKING=active`
- **THEN** solo se registra el worker de MSW
