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

### Requirement: Manejo de 401 como sesión vencida
El sistema SHALL tratar un 401 fuera de login, endpoints públicos y probes como sesión vencida: un solo aviso (latch), `queryClient.clear()` y navegación completa a `/login?redirectTo=...`. Un 401 con `error: "invalid_token"` MUST soltar el token en memoria siempre.

#### Scenario: Varias queries fallan con 401 a la vez
- **WHEN** varias requests en vuelo reciben 401
- **THEN** se procesa una única expiración y se redirige una sola vez a `/login`

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

### Requirement: Cierre de sesión
El sistema SHALL cerrar sesión con `POST /auth/logout` y MUST ejecutar `queryClient.clear()` para no reutilizar menú ni permisos (cacheados con `staleTime: Infinity`) con otro usuario.

#### Scenario: Logout
- **WHEN** el usuario elige "Cerrar sesión"
- **THEN** se llama `/auth/logout`, se vacía la cache de TanStack Query y se vuelve a `/login`

### Requirement: Modo autenticado sin conexión
El sistema SHALL persistir por usuario una `session` con claims no sensibles (`sub`, `name`, `roles`, `isSuperAdmin`, `menuSnapshot`, `permisos`, `savedAt`, `lastOnlineAuthAt`) y, si el refresh falla por red y existe `session` del último usuario en un equipo personal, MUST entrar en modo lectura sin token. El token y la cookie MUST NOT persistirse nunca.

#### Scenario: Abrir la app sin red con sesión previa
- **WHEN** el docente abre la app sin red en un equipo personal donde ya inició sesión
- **THEN** entra directo a la última ruta con el banner offline

#### Scenario: Abrir la app sin red por primera vez
- **WHEN** no existe `session` en el equipo y no hay red
- **THEN** el login muestra "Necesitas conexión para iniciar sesión por primera vez en este equipo."

#### Scenario: Reconexión con cookie vencida
- **WHEN** vuelve la red y el refresh responde 401
- **THEN** se pide login sin borrar los datos asociados al `sub`

### Requirement: Login sin conexión
La pantalla de login SHALL deshabilitar "Ingresar" sin red con "Necesitas conexión para iniciar sesión." y, si hay `session` del último usuario y el equipo no es compartido, MUST ofrecer "Continuar sin conexión como {nombre}".

#### Scenario: Equipo compartido
- **WHEN** el equipo está en modo compartido y no hay red
- **THEN** no se ofrece continuar sin conexión

### Requirement: Limpieza por usuario
El logout SHALL borrar las filas persistidas del `sub` (queries y session) además de `queryClient.clear()`, y un login de otro usuario MUST NOT leer filas ajenas.

#### Scenario: Otro usuario en el mismo navegador
- **WHEN** inicia sesión un usuario distinto al anterior
- **THEN** no ve datos del anterior y el buster por usuario invalida las queries
