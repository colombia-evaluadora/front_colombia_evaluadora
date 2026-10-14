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

### Requirement: Sin Service Worker de aplicación
El build SHALL NOT registrar un Service Worker propio ni persistir la cache de queries; recargar sin red no puede cargar HTML ni JS.

#### Scenario: Recarga sin red
- **WHEN** el usuario recarga cualquier página sin conexión
- **THEN** el navegador muestra su página de error de red

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
