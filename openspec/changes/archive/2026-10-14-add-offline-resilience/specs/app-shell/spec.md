## MODIFIED Requirements

### Requirement: Servido por Cloudflare Worker
El Worker SHALL reenviar `/api` y `/api/*` a `API_PROXY_TARGET` preservando `Set-Cookie`, servir el resto desde `env.ASSETS` como SPA y MUST agregar `Cache-Control: no-store` a toda respuesta de `/api` (BE-10).

#### Scenario: Request a la API
- **WHEN** el navegador hace `POST /api/eval-col/...`
- **THEN** el Worker lo reenvía al gateway del entorno (mismo origen, sin CORS)
- **AND** la respuesta lleva `Cache-Control: no-store`

#### Scenario: Navegación a una ruta de la SPA
- **WHEN** el navegador pide `/app/planeador/actividades`
- **THEN** el Worker sirve `index.html` desde los assets

## ADDED Requirements

### Requirement: Endpoint de salud
El backend SHALL exponer `GET /eval-col/health` sin autenticación, liviano y con respuesta JSON, y el front MUST tratarlo como endpoint no autenticado y probe (sin toast).

#### Scenario: Heartbeat sin sesión
- **WHEN** el heartbeat llama `/api/eval-col/health` sin token
- **THEN** responde 200 JSON y no se adjunta Bearer ni se muestra toast si falla
