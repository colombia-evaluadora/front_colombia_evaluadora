## MODIFIED Requirements

### Requirement: Restauración de sesión por refresh
El sistema SHALL restaurar la sesión llamando `POST /auth/refresh` (no existe `/auth/me`). Solo una respuesta 401 o 403 del refresh MUST interpretarse como "sin sesión"; un error de red, timeout o 5xx MUST propagarse como error de red y nunca como ausencia de sesión.

#### Scenario: Recarga con cookie válida
- **WHEN** el usuario recarga una ruta bajo `/app` y la cookie `sso_refresh` es válida
- **THEN** `getUser()` obtiene un token nuevo y `hasSession` devuelve verdadero

#### Scenario: Refresh responde 401
- **WHEN** el usuario recarga y `/auth/refresh` responde 401
- **THEN** `getUser()` devuelve `null` y el guard redirige a `/login?redirectTo=...`

#### Scenario: Recarga sin red
- **WHEN** el usuario recarga una ruta bajo `/app` y `/auth/refresh` falla por error de red
- **THEN** `getUser()` lanza un error de red
- **AND** el usuario NO es redirigido a `/login`

### Requirement: Guard de sesión en /app
El sistema SHALL ejecutar `hasSession(queryClient)` en el `beforeLoad` de `/app`, redirigir a `/login` con `redirectTo` solo cuando el servidor confirma que no hay sesión, y MUST reintentar hasta 3 veces con backoff (1 s, 2 s, 4 s) ante errores de red antes de mostrar un error recuperable.

#### Scenario: Sin sesión
- **WHEN** un visitante sin sesión navega a `/app/planeador/actividades` y el refresh responde 401
- **THEN** se redirige a `/login?redirectTo=/app/planeador/actividades`

#### Scenario: Red caída dos segundos durante la recarga
- **WHEN** el primer intento de refresh falla por red y el segundo responde con token
- **THEN** la página carga normalmente sin pasar por `/login`

#### Scenario: Red caída persistente
- **WHEN** los tres reintentos fallan por error de red
- **THEN** se muestra "No pudimos comunicarnos con el servidor" con el botón "Reintentar"
- **AND** la URL actual se conserva

### Requirement: Revalidación ante 403
El sistema SHALL, ante un 403 fuera de login, públicos y probes, llamar `POST /auth/refresh`; si el refresh responde con token, conserva la sesión y muestra el error; si el refresh responde 401, MUST tratarlo como sesión vencida; si el refresh falla por error de red, MUST rechazar la request original, conservar la sesión y la cache, y reportar el estado `degraded`.

#### Scenario: 403 real de permisos
- **WHEN** una request devuelve 403 y el refresh responde con token
- **THEN** la sesión se conserva y se muestra el mensaje de error

#### Scenario: 403 con sesión realmente vencida
- **WHEN** una request devuelve 403 y el refresh responde 401
- **THEN** se procesa la sesión vencida (un aviso, `queryClient.clear()`, `/login?redirectTo=...`)

#### Scenario: 403 con red caída durante el refresh
- **WHEN** una request devuelve 403 y el refresh falla por error de red
- **THEN** la cache de TanStack Query NO se limpia y no hay redirección
- **AND** el estado de conectividad pasa a `degraded`
