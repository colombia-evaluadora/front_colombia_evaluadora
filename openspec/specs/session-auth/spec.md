# session-auth Specification

## Purpose
Describe cómo el front autentica al usuario, restaura la sesión al recargar, la valida ante 401/403 y la cierra. El access token vive solo en memoria y la persistencia la da la cookie httpOnly `sso_refresh` (ver `src/lib/auth.ts` y `src/lib/api-client.ts`).

## Requirements

### Requirement: Inicio de sesión con email y contraseña
El sistema SHALL autenticar con `POST /auth/login`, enviar el header `x-remember-me: true` cuando el usuario marca "Mantener sesión iniciada" y derivar el usuario decodificando el JWT recibido (sin verificar firma), guardando el token solo en memoria.

#### Scenario: Login exitoso
- **WHEN** el usuario envía credenciales válidas
- **THEN** el token se fija con `setAuthToken` (nunca en `localStorage`)
- **AND** el usuario (`sub`, `name`, `roles`) se deriva de los claims del JWT

#### Scenario: Ya hay sesión al abrir /login
- **WHEN** el usuario con sesión válida abre `/login`
- **THEN** se redirige a `redirectTo` o a `/app`

### Requirement: Restauración de sesión por refresh
El sistema SHALL restaurar la sesión llamando `POST /auth/refresh` (no existe `/auth/me`) y MUST tratar cualquier error de esa llamada como "sin sesión".

#### Scenario: Recarga con cookie válida
- **WHEN** el usuario recarga una ruta bajo `/app` y la cookie `sso_refresh` es válida
- **THEN** `getUser()` obtiene un token nuevo y `hasSession` devuelve verdadero

#### Scenario: Recarga sin red
- **WHEN** el usuario recarga una ruta bajo `/app` y `/auth/refresh` falla por error de red
- **THEN** `getUser()` devuelve `null`
- **AND** el guard de `/app` redirige a `/login?redirectTo=...`

### Requirement: Guard de sesión en /app
El sistema SHALL ejecutar `hasSession(queryClient)` en el `beforeLoad` de `/app` y redirigir a `/login` con `redirectTo` cuando no hay usuario.

#### Scenario: Sin sesión
- **WHEN** un visitante sin sesión navega a `/app/planeador/actividades`
- **THEN** se redirige a `/login?redirectTo=/app/planeador/actividades`

### Requirement: Manejo de 401 como sesión vencida
El sistema SHALL tratar un 401 fuera de login, endpoints públicos y probes como sesión vencida: un solo aviso (latch), `queryClient.clear()` y navegación completa a `/login?redirectTo=...`. Un 401 con `error: "invalid_token"` MUST soltar el token en memoria siempre.

#### Scenario: Varias queries fallan con 401 a la vez
- **WHEN** varias requests en vuelo reciben 401
- **THEN** se procesa una única expiración y se redirige una sola vez a `/login`

### Requirement: Revalidación ante 403
El sistema SHALL, ante un 403 fuera de login, públicos y probes, llamar `POST /auth/refresh`; si el refresh responde, conserva la sesión y muestra el error; si el refresh falla por cualquier motivo, incluido un error de red, MUST tratarlo como sesión vencida.

#### Scenario: 403 real de permisos
- **WHEN** una request devuelve 403 y el refresh responde con token
- **THEN** la sesión se conserva y se muestra el mensaje de error

#### Scenario: 403 con red caída durante el refresh
- **WHEN** una request devuelve 403 y el refresh falla por error de red
- **THEN** se limpia toda la cache (`queryClient.clear()`) y se redirige a `/login`

### Requirement: Cierre de sesión
El sistema SHALL cerrar sesión con `POST /auth/logout` y MUST ejecutar `queryClient.clear()` para no reutilizar menú ni permisos (cacheados con `staleTime: Infinity`) con otro usuario.

#### Scenario: Logout
- **WHEN** el usuario elige "Cerrar sesión"
- **THEN** se llama `/auth/logout`, se vacía la cache de TanStack Query y se vuelve a `/login`
