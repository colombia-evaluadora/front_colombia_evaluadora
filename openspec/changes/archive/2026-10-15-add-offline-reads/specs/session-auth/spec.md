## ADDED Requirements

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
